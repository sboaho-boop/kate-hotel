"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendSms, welcomeSmsText } from "@/lib/sms";
import { getHotelSettings } from "@/lib/hotel-settings";
import { notifyManagement } from "@/lib/notify";
import type { RoleKey } from "@/types/next-auth";
import type { Room, Stay, User } from "@prisma/client";

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

type CheckInTxResult =
  | { success: true; guest: User; stay: Stay; room: Room; existingGuest: User | null; password: string; paid: boolean }
  | { success: false; message: string };

const requireReception = async (actorId: string) => {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !(["SUPER_ADMIN", "ADMIN", "RECEPTION"] as RoleKey[]).includes(actor.role as RoleKey)) {
    throw new Error("Not authorized");
  }
  return actor;
};

const checkInSchema = z
  .object({
    guestName: z.string().trim().min(2, "Guest name is required"),
    guestPhone: z.string().trim().min(7, "A valid phone number is required"),
    guestEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
    nationalId: z.string().trim().optional().or(z.literal("")),
    address: z.string().trim().optional().or(z.literal("")),
    guestPassword: z.string().trim().optional().or(z.literal("")),
    roomId: z.string().min(1, "Select a room"),
    nfcCardId: z.string().min(1, "Select an NFC card"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "OTHER"]),
    paymentStatus: z.enum(["PAID", "UNPAID"]),
    paymentReference: z.string().trim().max(60).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (
      (val.paymentMethod === "CARD" || val.paymentMethod === "MOBILE") &&
      !val.paymentReference
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["paymentReference"],
        message:
          val.paymentMethod === "MOBILE"
            ? "A mobile money reference number is required"
            : "A POS/card transaction reference is required",
      });
    }
  });

export async function checkInGuest(
  actorId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = checkInSchema.safeParse({
    guestName: formData.get("guestName"),
    guestPhone: formData.get("guestPhone"),
    guestEmail: formData.get("guestEmail"),
    nationalId: formData.get("nationalId"),
    address: formData.get("address"),
    guestPassword: formData.get("guestPassword"),
    roomId: formData.get("roomId"),
    nfcCardId: formData.get("nfcCardId"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    paymentStatus: formData.get("paymentStatus"),
    paymentReference: formData.get("paymentReference") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] = fieldErrors[key] ?? issue.message;
    }
    return { success: false, message: "Please fix the errors below.", fieldErrors };
  }

  const data = parsed.data;
  const phone = data.guestPhone.replace(/[^+\d]/g, "");

  try {
    const actor = await requireReception(actorId);

    const result: CheckInTxResult = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: data.roomId } });
      if (!room || room.status !== "AVAILABLE") {
        return { success: false, message: "That room is not available." };
      }

      const card = await tx.nfcCard.findUnique({ where: { id: data.nfcCardId } });
      if (!card) {
        return { success: false, message: "Card not found." };
      }
      if (card.status === "ASSIGNED" && card.roomId !== room.id) {
        return { success: false, message: "That card is assigned to another room." };
      }
      if (card.status === "REVOKED") {
        return { success: false, message: "That card has been revoked." };
      }

      const existingGuest =
        (await tx.user.findFirst({ where: { phone, role: "GUEST" } })) ??
        (data.guestEmail
          ? await tx.user.findFirst({ where: { email: data.guestEmail.toLowerCase(), role: "GUEST" } })
          : null);

      const password = data.guestPassword?.trim() || `guest${phone.slice(-4) || "1234"}`;
      const email = data.guestEmail?.trim().toLowerCase() || `guest-${Date.now()}@portal.local`;

      let guest = existingGuest;
      if (!guest) {
        guest = await tx.user.create({
          data: {
            name: data.guestName,
            email,
            phone,
            nationalId: data.nationalId || null,
            address: data.address || null,
            passwordHash: await bcrypt.hash(password, 10),
            role: "GUEST",
          },
        });
      }

      const paid = data.paymentStatus === "PAID";

      const stay = await tx.stay.create({
        data: {
          guestId: guest.id,
          roomId: room.id,
          nfcCardId: card.id,
          receptionistId: actorId,
          status: "CHECKED_IN",
        },
      });

      await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });
      await tx.nfcCard.update({
        where: { id: card.id },
        data: { roomId: room.id, status: "ASSIGNED", issuedById: actorId, issuedAt: new Date() },
      });

      await tx.payment.create({
        data: {
          stayId: stay.id,
          amount: data.amount,
          method: data.paymentMethod,
          status: paid ? "PAID" : "UNPAID",
          reference: data.paymentReference || null,
          paidAt: paid ? new Date() : null,
          recordedById: actorId,
        },
      });

      await tx.checkInLog.create({ data: { stayId: stay.id, actorId, action: "CHECK_IN" } });

      return {
        success: true as const,
        message: "",
        guest,
        stay,
        room,
        existingGuest,
        password,
        paid,
      };
    });

    if (!result.success) return { success: false, message: result.message };

    await logAudit(actorId, "CHECK_IN", "Stay", result.stay.id, {
      room: result.room.number,
      guest: result.guest.name,
      paid: result.paid,
    });

    const sms = await sendSms({
      phone,
      message: welcomeSmsText(result.room.number),
      stayId: result.stay.id,
      sentById: actorId,
    });

    await notifyManagement({
      type: "CHECK_IN",
      title: `New check-in — Room ${result.room.number}`,
      body: `${result.guest.name} checked in by ${actor.name} · ${result.paid ? "Paid" : "UNPAID"} · SMS ${sms.status}`,
    });

    revalidatePath("/dashboard/reception/checkin");
    revalidatePath("/dashboard/reception");
    return {
      success: true,
      message: `${result.guest.name} checked into Room ${result.room.number}. ${
        result.existingGuest ? "" : `Guest portal login: ${phone} / ${result.password}. `
      }SMS ${sms.status} (${result.paid ? "paid" : "unpaid — follow up"}).`,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Check-in failed." };
  }
}

export async function checkOut(actorId: string, stayId: string): Promise<void> {
  await requireReception(actorId);

  const stay = await prisma.stay.findUnique({ where: { id: stayId } });
  if (!stay || stay.status !== "CHECKED_IN") throw new Error("Stay not active.");

  await prisma.$transaction([
    prisma.stay.update({ where: { id: stayId }, data: { status: "CHECKED_OUT", checkOutAt: new Date() } }),
    prisma.room.update({ where: { id: stay.roomId }, data: { status: "CLEANING" } }),
    prisma.checkInLog.create({ data: { stayId, actorId, action: "CHECK_OUT" } }),
  ]);

  await logAudit(actorId, "CHECK_OUT", "Stay", stayId);
  revalidatePath("/dashboard/reception/checkin");
  revalidatePath("/dashboard/reception");
}

export async function settlePayment(actorId: string, paymentId: string): Promise<void> {
  await requireReception(actorId);

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status === "PAID") throw new Error("Payment already settled.");

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date(), recordedById: actorId },
  });
  await logAudit(actorId, "SETTLE_PAYMENT", "Payment", paymentId, { amount: payment.amount });
  revalidatePath("/dashboard/reception/checkin");
  revalidatePath("/dashboard/reception/payments");
}

export async function flagUnpaid(actorId: string, stayId: string): Promise<void> {
  await requireReception(actorId);
  await prisma.checkInLog.create({ data: { stayId, actorId, action: "TRANSFER_FLAG" } });
  await logAudit(actorId, "TRANSFER_FLAG", "Stay", stayId);
  revalidatePath("/dashboard/reception/checkin");
  revalidatePath("/dashboard/reception");
}

export async function unflagUnpaid(actorId: string, stayId: string): Promise<void> {
  await requireReception(actorId);
  await prisma.checkInLog.create({ data: { stayId, actorId, action: "TRANSFER_UNFLAG" } });
  await logAudit(actorId, "TRANSFER_UNFLAG", "Stay", stayId);
  revalidatePath("/dashboard/reception/checkin");
  revalidatePath("/dashboard/reception");
}

export async function startShift(actorId: string): Promise<void> {
  await requireReception(actorId);

  const active = await prisma.shift.findFirst({ where: { userId: actorId, status: "ACTIVE" } });
  if (active) throw new Error("You already have an active shift.");

  await prisma.shift.create({ data: { userId: actorId, status: "ACTIVE" } });
  await prisma.user.update({ where: { id: actorId }, data: { isOnDuty: true } });
  await logAudit(actorId, "START_SHIFT", "Shift");
  revalidatePath("/dashboard/reception");
}

export async function endShift(actorId: string): Promise<ActionResult> {
  try {
    await requireReception(actorId);

    const shift = await prisma.shift.findFirst({
      where: { userId: actorId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    if (!shift) return { success: false, message: "No active shift to close." };

    const endedAt = new Date();

    await prisma.shift.update({ where: { id: shift.id }, data: { endedAt, status: "CLOSED" } });
    await prisma.user.update({ where: { id: actorId }, data: { isOnDuty: false } });

    const report = await prisma.shiftReport.create({
      data: {
        shiftId: shift.id,
        sentToId:
          (
            await prisma.user.findFirst({
              where: { role: "ADMIN", isActive: true },
              orderBy: { createdAt: "asc" },
            })
          )?.id ?? null,
      },
    });

    await notifyManagement({
      type: "SHIFT_REPORT",
      title: "Shift report ready",
      body: `${(await getHotelSettings()).name}: ${actorId} closed their shift. Report #${report.id} is available to admin.`,
    });
    await logAudit(actorId, "END_SHIFT", "Shift", shift.id, { report: report.id });

    revalidatePath("/dashboard/reception");
    revalidatePath("/dashboard/admin/reports");
    revalidatePath("/dashboard/super-admin/reports");
    return { success: true, message: `Shift closed. Your PDF report is ready below — download or print it.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to close shift." };
  }
}

export async function getActiveShift(userId: string) {
  return prisma.shift.findFirst({ where: { userId, status: "ACTIVE" }, orderBy: { startedAt: "desc" } });
}
