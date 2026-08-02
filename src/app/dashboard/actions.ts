"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import type { ConversationSummary, StaffOption } from "@/lib/chat";
import type { RoleKey } from "@/types/next-auth";

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const requireUser = async (actorId: string) => {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor) throw new Error("Not authorized");
  return actor;
};

const isManagement = (role: RoleKey) => role === "SUPER_ADMIN" || role === "ADMIN";

const chatPaths = [
  "/dashboard/reception/chats",
  "/dashboard/admin/chats",
  "/dashboard/super-admin/chats",
  "/dashboard/guest/chat",
  "/dashboard/cleaner/messages",
];

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard/admin/notifications");
  revalidatePath("/dashboard/super-admin/notifications");
}

/* ------------------------------- Chat ------------------------------- */

export async function conversationsForUser(actorId: string): Promise<ConversationSummary[]> {
  const actor = await requireUser(actorId);
  const role = actor.role as RoleKey;

  let where;
  if (isManagement(role)) {
    where = {};
  } else if (role === "RECEPTION") {
    where = {
      OR: [
        { type: "GUEST_SUPPORT" as const },
        { type: "INTERNAL" as const, userId: actorId },
        { messages: { some: { OR: [{ senderId: actorId }, { receiverId: actorId }] } } },
      ],
    };
  } else {
    where = {
      OR: [
        { userId: actorId },
        { messages: { some: { OR: [{ senderId: actorId }, { receiverId: actorId }] } } },
      ],
    };
  }

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
    },
  });

  const guestConversations = conversations.filter((c) => c.type === "GUEST_SUPPORT");
  const stays = guestConversations.length
    ? await prisma.stay.findMany({
        where: { guestId: { in: guestConversations.map((c) => c.userId) }, status: "CHECKED_IN" },
        include: { room: { select: { number: true } } },
      })
    : [];
  const roomByGuest = new Map(stays.map((s) => [s.guestId, s.room.number]));

  const unreadGroups = await prisma.message.groupBy({
    by: ["conversationId"],
    where: { receiverId: actorId, readAt: null },
    _count: true,
  });
  const unreadMap = new Map(unreadGroups.map((u) => [u.conversationId, u._count]));

  return conversations.map((c) => {
    const last = c.messages[0];
    let otherName = c.user.name;
    if (c.type !== "GUEST_SUPPORT" && c.userId === actorId && last) {
      otherName = last.sender.name;
    }
    return {
      id: c.id,
      type: c.type,
      guestName: c.type === "GUEST_SUPPORT" ? c.user.name : null,
      roomNumber: c.type === "GUEST_SUPPORT" ? roomByGuest.get(c.userId) ?? null : null,
      otherName,
      lastMessage: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      unread: unreadMap.get(c.id) ?? 0,
    };
  });
}

export async function staffForRelay(actorId: string): Promise<StaffOption[]> {
  await requireUser(actorId);
  return prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "RECEPTION", "CLEANER"] }, id: { not: actorId } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

async function resolveReceiver(
  conversation: { id: string; type: string; userId: string },
  senderId: string
) {
  const last = await prisma.message.findFirst({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    select: { senderId: true },
  });
  if (last) return last.senderId;

  if (conversation.type === "GUEST_SUPPORT") {
    const isGuest = conversation.userId === senderId;
    if (isGuest) {
      const onDuty = await prisma.user.findFirst({
        where: { role: "RECEPTION", isOnDuty: true, isActive: true },
        select: { id: true },
      });
      if (onDuty) return onDuty.id;
      const stay = await prisma.stay.findFirst({
        where: { guestId: senderId, status: "CHECKED_IN" },
        select: { receptionistId: true },
      });
      if (stay) return stay.receptionistId;
      const anyReception = await prisma.user.findFirst({
        where: { role: "RECEPTION", isActive: true },
        select: { id: true },
      });
      return anyReception?.id ?? senderId;
    }
    return conversation.userId;
  }
  return conversation.userId;
}

async function canSend(
  conversation: { id: string; type: string; userId: string },
  actor: { id: string; role: RoleKey }
) {
  if (isManagement(actor.role)) return true;
  if (actor.role === "RECEPTION" && conversation.type === "GUEST_SUPPORT") return true;
  if (conversation.userId === actor.id) return true;
  const involved = await prisma.message.findFirst({
    where: { conversationId: conversation.id, OR: [{ senderId: actor.id }, { receiverId: actor.id }] },
    select: { id: true },
  });
  return !!involved;
}

export async function sendMessage(actorId: string, conversationId: string, body: string): Promise<ActionResult> {
  try {
    const actor = await requireUser(actorId);
    const text = body.trim();
    if (!text) return { success: false, message: "Message cannot be empty." };
    if (text.length > 1000) return { success: false, message: "Message is too long." };

    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) return { success: false, message: "Conversation not found." };

    if (!(await canSend(conversation, { id: actorId, role: actor.role as RoleKey }))) {
      return { success: false, message: "You cannot send messages to this conversation." };
    }

    const receiverId = await resolveReceiver(conversation, actorId);

    await prisma.message.create({
      data: { conversationId, senderId: actorId, receiverId, body: text },
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });

    chatPaths.forEach((p) => revalidatePath(p));
    return { success: true, message: "Sent." };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to send message." };
  }
}

export async function markConversationRead(actorId: string, conversationId: string): Promise<void> {
  await requireUser(actorId);
  await prisma.message.updateMany({
    where: { conversationId, receiverId: actorId, readAt: null },
    data: { readAt: new Date() },
  });
  chatPaths.forEach((p) => revalidatePath(p));
}

export async function relayToStaff(actorId: string, conversationId: string, staffId: string): Promise<ActionResult> {
  try {
    const actor = await requireUser(actorId);
    if (!isManagement(actor.role as RoleKey) && actor.role !== "RECEPTION") {
      return { success: false, message: "Only reception or admins can relay messages." };
    }
    if (actorId === staffId) return { success: false, message: "Pick a different staff member." };

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.role === "GUEST") return { success: false, message: "Pick a valid staff member." };

    const source = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (!source) return { success: false, message: "Conversation not found." };

    const context = source.type === "GUEST_SUPPORT" ? source.userId : null;
    const guestName = context
      ? (await prisma.user.findUnique({ where: { id: context }, select: { name: true } }))?.name
      : null;
    const latest = source.messages[0]?.body ?? "(no message)";
    const relayText = guestName ? `[Relayed from guest ${guestName}] ${latest}` : `[Relayed] ${latest}`;

    let internal = await prisma.conversation.findFirst({
      where: { type: "INTERNAL", userId: staffId },
    });
    if (!internal) {
      internal = await prisma.conversation.create({
        data: { type: "INTERNAL", userId: staffId, subject: "Internal relay" },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: internal.id,
        senderId: actorId,
        receiverId: staffId,
        body: relayText,
        relayedById: source.messages[0]?.id ?? null,
      },
    });
    await prisma.conversation.update({ where: { id: internal.id }, data: { updatedAt: new Date() } });

    await notifyUser({
      userId: staffId,
      type: "RELAY",
      title: `Message relayed by ${actor.name}`,
      body: relayText.slice(0, 140),
    });
    await logAudit(actorId, "RELAY_MESSAGE", "Conversation", internal.id);

    chatPaths.forEach((p) => revalidatePath(p));
    return { success: true, message: `Relayed to ${staff.name}.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to relay message." };
  }
}

export async function ensureGuestConversation(guestId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { type: "GUEST_SUPPORT", userId: guestId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { type: "GUEST_SUPPORT", userId: guestId, subject: "Guest support" },
  });
}

/* ----------------------------- Housekeeping ----------------------------- */

const assignTaskSchema = z.object({
  roomId: z.string().min(1, "Select a room"),
  assignedToId: z.string().min(1, "Select a cleaner"),
  notes: z.preprocess((v) => (v == null ? "" : v), z.string().trim()),
});

export async function assignTask(actorId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = assignTaskSchema.safeParse({
    roomId: formData.get("roomId"),
    assignedToId: formData.get("assignedToId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] = fieldErrors[key] ?? issue.message;
    }
    return { success: false, message: "Please fix the errors below.", fieldErrors };
  }

  try {
    const actor = await requireUser(actorId);
    if (!isManagement(actor.role as RoleKey) && actor.role !== "RECEPTION") {
      return { success: false, message: "Not authorized." };
    }

    const cleaner = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!cleaner || cleaner.role !== "CLEANER" || !cleaner.isActive) {
      return { success: false, message: "Pick an active cleaner." };
    }

    const room = await prisma.room.findUnique({ where: { id: parsed.data.roomId } });
    if (!room) return { success: false, message: "Room not found." };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await prisma.housekeepingTask.findFirst({
      where: { roomId: room.id, taskDate: { gte: startOfDay, lt: endOfDay } },
    });
    if (existing) {
      return { success: false, message: `Room ${room.number} already has a task for today.` };
    }

    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: room.id,
        assignedToId: cleaner.id,
        assignedById: actorId,
        taskDate: new Date(),
        notes: parsed.data.notes || null,
      },
    });

    await notifyUser({
      userId: cleaner.id,
      type: "TASK",
      title: `New cleaning task — Room ${room.number}`,
      body: parsed.data.notes || undefined,
    });
    await logAudit(actorId, "ASSIGN_TASK", "HousekeepingTask", task.id, {
      room: room.number,
      cleaner: cleaner.name,
    });

    revalidatePath("/dashboard/reception/housekeeping");
    revalidatePath("/dashboard/admin/housekeeping");
    revalidatePath("/dashboard/super-admin/housekeeping");
    revalidatePath("/dashboard/cleaner");
    return { success: true, message: `Task for Room ${room.number} assigned to ${cleaner.name}.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to assign task." };
  }
}

export async function setTaskStatus(
  actorId: string,
  taskId: string,
  status: "IN_PROGRESS" | "DONE"
): Promise<void> {
  const actor = await requireUser(actorId);
  const task = await prisma.housekeepingTask.findUnique({
    where: { id: taskId },
    include: { room: true },
  });
  if (!task) throw new Error("Task not found.");

  const isOwner = task.assignedToId === actorId;
  const canManage = isOwner || isManagement(actor.role as RoleKey) || actor.role === "RECEPTION";
  if (!canManage) throw new Error("Not authorized.");

  await prisma.housekeepingTask.update({
    where: { id: taskId },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });

  if (status === "DONE") {
    const room = await prisma.room.findUnique({ where: { id: task.roomId } });
    if (room && room.status === "CLEANING") {
      await prisma.room.update({ where: { id: room.id }, data: { status: "AVAILABLE" } });
    }
  }

  await logAudit(actorId, status === "DONE" ? "TASK_DONE" : "TASK_STARTED", "HousekeepingTask", taskId, {
    room: task.room.number,
  });

  revalidatePath("/dashboard/reception/housekeeping");
  revalidatePath("/dashboard/admin/housekeeping");
  revalidatePath("/dashboard/super-admin/housekeeping");
  revalidatePath("/dashboard/cleaner");
}
