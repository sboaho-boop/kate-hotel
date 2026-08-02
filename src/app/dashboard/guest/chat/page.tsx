import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureGuestConversation } from "@/app/dashboard/actions";
import { ChatThread } from "@/components/chat/chat-thread";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Chat | Hotel HMS" };
export const dynamic = "force-dynamic";

export default async function GuestChatPage() {
  const session = await getServerSession(authOptions);

  const [conversation, stay] = await Promise.all([
    ensureGuestConversation(session!.user.id),
    prisma.stay.findFirst({
      where: { guestId: session!.user.id, status: "CHECKED_IN" },
      include: { room: { select: { number: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat with reception</h1>
        <p className="text-sm text-gray-500">
          {stay
            ? `You are checked into Room ${stay.room.number}. Messages are answered during reception hours.`
            : "Messages are answered by reception during opening hours."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Guest support</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatThread conversationId={conversation.id} currentUserId={session!.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
