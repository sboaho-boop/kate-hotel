import { prisma } from "@/lib/prisma";

/**
 * Creates an in-app notification for a user. Returns void.
 */
export async function notifyUser(opts: {
  userId: string;
  type: string;
  title: string;
  body?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      body: opts.body,
    },
  });
}

/**
 * Notifies all Admin and Super Admin users (used for check-in alerts).
 */
export async function notifyManagement(opts: { type: string; title: string; body?: string }) {
  const managers = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, isActive: true },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      type: opts.type,
      title: opts.title,
      body: opts.body,
    })),
  });
}
