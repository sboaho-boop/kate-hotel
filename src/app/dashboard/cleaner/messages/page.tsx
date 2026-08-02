import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { conversationsForUser } from "@/app/dashboard/actions";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export const metadata: Metadata = { title: "Messages | Hotel HMS" };
export const dynamic = "force-dynamic";

export default async function CleanerMessagesPage() {
  const session = await getServerSession(authOptions);
  const conversations = await conversationsForUser(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">Internal messages relayed to you by reception or admins.</p>
      </div>

      <ChatWorkspace conversations={conversations} currentUserId={session!.user.id} />
    </div>
  );
}
