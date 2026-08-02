import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conversationsForUser, staffForRelay } from "@/app/dashboard/actions";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export const metadata: Metadata = { title: "Chat Monitoring | Hotel HMS" };
export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  const session = await getServerSession(authOptions);
  const [conversations, staff] = await Promise.all([
    conversationsForUser(session!.user.id),
    staffForRelay(session!.user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat monitoring</h1>
        <p className="text-sm text-gray-500">Oversight of guest support and internal messages.</p>
      </div>

      <ChatWorkspace conversations={conversations} currentUserId={session!.user.id} showRelay staff={staff} />
    </div>
  );
}
