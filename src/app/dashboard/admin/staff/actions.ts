"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { RoleKey } from "@/types/next-auth";

export type ActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const createStaffSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "RECEPTION", "CLEANER"]),
});

const currentUser = async (actorId: string, allowed: RoleKey[]) => {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !allowed.includes(actor.role as RoleKey)) {
    throw new Error("Not authorized");
  }
  return actor;
};

export async function createStaff(actorId: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
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
    await currentUser(actorId, ["SUPER_ADMIN", "ADMIN"]);

    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) {
      return { success: false, message: "A user with that email already exists." };
    }

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash: await bcrypt.hash(data.password, 10),
        role: data.role as RoleKey,
      },
    });

    await logAudit(actorId, "CREATE", "User", user.id, { role: user.role, name: user.name });
    revalidatePath("/dashboard/admin/staff");
    revalidatePath("/dashboard/super-admin/staff");
    return { success: true, message: `Staff account created for ${user.name}.` };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Failed to create staff account." };
  }
}

export async function toggleActive(actorId: string, id: string): Promise<void> {
  await currentUser(actorId, ["SUPER_ADMIN", "ADMIN"]);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found.");
  if (user.role === "SUPER_ADMIN") throw new Error("Cannot deactivate the Super Admin.");

  const next = !user.isActive;
  await prisma.user.update({ where: { id }, data: { isActive: next } });
  await logAudit(actorId, next ? "ACTIVATE" : "DEACTIVATE", "User", id, { name: user.name });
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/super-admin/staff");
}

export async function toggleOnDuty(actorId: string, id: string): Promise<void> {
  await currentUser(actorId, ["SUPER_ADMIN", "ADMIN"]);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found.");
  if (!["RECEPTION", "CLEANER"].includes(user.role)) {
    throw new Error("Only reception and cleaning staff can be marked on duty.");
  }

  const next = !user.isOnDuty;
  await prisma.user.update({ where: { id }, data: { isOnDuty: next } });
  await logAudit(actorId, next ? "MARK_ON_DUTY" : "MARK_OFF_DUTY", "User", id, { name: user.name });
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/super-admin/staff");
}

export async function resetPassword(actorId: string, id: string, _formData: FormData): Promise<void> {
  await currentUser(actorId, ["SUPER_ADMIN", "ADMIN"]);
  const password = String(_formData.get("password") ?? "");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User not found.");

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  await logAudit(actorId, "RESET_PASSWORD", "User", id, { name: user.name });
  revalidatePath("/dashboard/admin/staff");
  revalidatePath("/dashboard/super-admin/staff");
}
