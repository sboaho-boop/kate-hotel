import { prisma } from "@/lib/prisma";
import type { RoleKey } from "@/types/next-auth";

export type ConversationSummary = {
  id: string;
  type: "GUEST_SUPPORT" | "INTERNAL";
  guestName: string | null;
  roomNumber: string | null;
  otherName: string | null;
  lastMessage: string | null;
  lastAt: string;
  unread: number;
};

export type StaffOption = {
  id: string;
  name: string;
  role: string;
};

export async function canAccessConversation(opts: {
  conversationId: string;
  actorId: string;
  role: RoleKey;
}): Promise<boolean> {
  const conversation = await prisma.conversation.findUnique({ where: { id: opts.conversationId } });
  if (!conversation) return false;

  if (opts.role === "SUPER_ADMIN" || opts.role === "ADMIN") return true;
  if (conversation.userId === opts.actorId) return true;
  if (opts.role === "RECEPTION" && conversation.type === "GUEST_SUPPORT") return true;

  const involved = await prisma.message.findFirst({
    where: {
      conversationId: opts.conversationId,
      OR: [{ senderId: opts.actorId }, { receiverId: opts.actorId }],
    },
    select: { id: true },
  });
  return !!involved;
}
