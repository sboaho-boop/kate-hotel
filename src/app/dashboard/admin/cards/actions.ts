"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { RoleKey } from "@/types/next-auth";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";

const requireAdmin = async (actorId: string) => {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !(["SUPER_ADMIN", "ADMIN"] as RoleKey[]).includes(actor.role as RoleKey)) {
    throw new Error("Not authorized");
  }
};

export async function createCard(actorId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const uid = z.string().trim().min(3, "Card UID is required").safeParse(formData.get("uid"));

  if (!uid.success) {
    return { success: false, message: uid.error.issues[0].message };
  }

  try {
    await requireAdmin(actorId);

    const existing = await prisma.nfcCard.findUnique({ where: { uid: uid.data } });
    if (existing) return { success: false, message: "A card with that UID already exists." };

    const card = await prisma.nfcCard.create({
      data: { uid: uid.data, status: "UNASSIGNED" },
    });
    await logAudit(actorId, "CREATE", "NfcCard", card.id, { uid: uid.data });
    revalidatePath("/dashboard/admin/cards");
    revalidatePath("/dashboard/super-admin/cards");
    return { success: true, message: `Card ${uid.data} registered.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to register card." };
  }
}

export async function assignCard(actorId: string, id: string, formData: FormData): Promise<void> {
  await requireAdmin(actorId);

  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) throw new Error("Select a room.");

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error("Room not found.");

  const card = await prisma.nfcCard.update({
    where: { id },
    data: { roomId, status: "ASSIGNED", issuedById: actorId, issuedAt: new Date() },
  });
  await logAudit(actorId, "ASSIGN_CARD", "NfcCard", id, { uid: card.uid, room: room.number });
  revalidatePath("/dashboard/admin/cards");
  revalidatePath("/dashboard/super-admin/cards");
}

export async function revokeCard(actorId: string, id: string): Promise<void> {
  await requireAdmin(actorId);

  const card = await prisma.nfcCard.update({
    where: { id },
    data: { roomId: null, status: "REVOKED", issuedById: null, issuedAt: null },
  });
  await logAudit(actorId, "REVOKE_CARD", "NfcCard", id, { uid: card.uid });
  revalidatePath("/dashboard/admin/cards");
  revalidatePath("/dashboard/super-admin/cards");
}
