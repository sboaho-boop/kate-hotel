import { prisma } from "@/lib/prisma";

export async function logAudit(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  meta?: unknown
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity,
      entityId,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}
