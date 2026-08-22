"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { setSettings, CURRENCIES } from "@/lib/hotel-settings";
import type { RoleKey } from "@/types/next-auth";

export type SettingsResult = {
  success: boolean;
  message: string;
};

const schema = z.object({
  hotelName: z.string().trim().min(2, "Hotel name is required"),
  currency: z
    .string()
    .transform((v) => v.toUpperCase())
    .refine((v) => CURRENCIES.some((c) => c.code === v), "Unknown currency"),
});

async function requireAdmin(actorId: string) {
  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor || !(["SUPER_ADMIN", "ADMIN"] as RoleKey[]).includes(actor.role as RoleKey)) {
    throw new Error("Not authorized");
  }
  return actor;
}

export async function saveSettings(
  actorId: string,
  _prev: SettingsResult,
  formData: FormData
): Promise<SettingsResult> {
  try {
    const actor = await requireAdmin(actorId);

    const parsed = schema.safeParse({
      hotelName: formData.get("hotelName"),
      currency: formData.get("currency"),
    });
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    await setSettings({
      hotelName: parsed.data.hotelName,
      currency: parsed.data.currency,
    });

    await logAudit(actorId, "UPDATE_SETTINGS", "Setting", undefined, {
      by: actor.name,
      name: parsed.data.hotelName,
      currency: parsed.data.currency,
    });

    revalidatePath("/dashboard/admin/settings");
    revalidatePath("/dashboard/super-admin/settings");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Saved. Hotel name and currency (${parsed.data.currency}) updated everywhere.`,
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Save failed." };
  }
}
