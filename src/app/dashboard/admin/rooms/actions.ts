"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { RoleKey } from "@/types/next-auth";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";

const createRoomSchema = z.object({
  number: z.string().trim().min(1, "Room number is required"),
  floor: z.coerce.number().int().min(0, "Floor must be 0 or more"),
  type: z.enum(["SINGLE", "DOUBLE", "TWIN", "SUITE", "FAMILY", "DELUXE"]),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  price: z.coerce.number().positive("Price must be greater than 0"),
});

const requireAdmin = async (actorId: string) => {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !(["SUPER_ADMIN", "ADMIN"] as RoleKey[]).includes(actor.role as RoleKey)) {
    throw new Error("Not authorized");
  }
};

export async function createRoom(actorId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = createRoomSchema.safeParse({
    number: formData.get("number"),
    floor: formData.get("floor"),
    type: formData.get("type"),
    capacity: formData.get("capacity"),
    price: formData.get("price"),
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

  try {
    await requireAdmin(actorId);

    const existing = await prisma.room.findUnique({ where: { number: data.number } });
    if (existing) return { success: false, message: "A room with that number already exists." };

    const room = await prisma.room.create({ data });
    await logAudit(actorId, "CREATE", "Room", room.id, { number: room.number });
    revalidatePath("/dashboard/admin/rooms");
    revalidatePath("/dashboard/super-admin/rooms");
    return { success: true, message: `Room ${room.number} created.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to create room." };
  }
}

export async function updateRoomStatus(actorId: string, id: string, formData: FormData): Promise<void> {
  await requireAdmin(actorId);
  const status = String(formData.get("status") ?? "");
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new Error("Room not found.");

  await prisma.room.update({ where: { id }, data: { status: status as never } });
  await logAudit(actorId, "UPDATE_ROOM_STATUS", "Room", id, { number: room.number, status });
  revalidatePath("/dashboard/admin/rooms");
  revalidatePath("/dashboard/super-admin/rooms");
}
