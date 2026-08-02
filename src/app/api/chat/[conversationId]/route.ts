import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessConversation } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const ok = await canAccessConversation({
    conversationId,
    actorId: session.user.id,
    role: session.user.role,
  });
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  await prisma.message.updateMany({
    where: { conversationId, receiverId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender.id,
      senderName: m.sender.name,
      senderRole: m.sender.role,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
