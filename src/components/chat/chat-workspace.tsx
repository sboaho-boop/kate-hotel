"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Share2 } from "lucide-react";
import { markConversationRead, relayToStaff } from "@/app/dashboard/actions";
import { ChatThread } from "@/components/chat/chat-thread";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import type { ConversationSummary, StaffOption } from "@/lib/chat";
import { cn } from "@/lib/utils";

export function ChatWorkspace({
  conversations,
  currentUserId,
  showRelay,
  staff = [],
}: {
  conversations: ConversationSummary[];
  currentUserId: string;
  showRelay?: boolean;
  staff?: StaffOption[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id ?? null);
  const [relayTarget, setRelayTarget] = useState("");
  const [relayStatus, setRelayStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [relaying, setRelaying] = useState(false);

  useEffect(() => {
    if (!selectedId) setSelectedId(conversations[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  const selected = conversations.find((c) => c.id === selectedId);

  function selectConversation(id: string) {
    setSelectedId(id);
    setRelayStatus(null);
    setRelayTarget("");
    markConversationRead(currentUserId, id).catch(() => undefined);
  }

  async function onRelay() {
    if (!selected || !relayTarget || relaying) return;
    setRelaying(true);
    setRelayStatus(null);
    const res = await relayToStaff(currentUserId, selected.id, relayTarget);
    setRelaying(false);
    setRelayStatus({ ok: res.success, text: res.message });
    if (res.success) setRelayTarget("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">Conversations</p>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">
              No conversations yet. Incoming guest and internal messages will appear here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                  c.id === selectedId && "bg-indigo-50"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {c.guestName ?? c.otherName ?? "Thread"}
                    </p>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {new Date(c.lastAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone={c.type === "GUEST_SUPPORT" ? "blue" : "indigo"}>
                      {c.type === "GUEST_SUPPORT" ? "Guest" : "Internal"}
                    </Badge>
                    {c.roomNumber ? (
                      <span className="text-[11px] text-gray-500">Room {c.roomNumber}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">{c.lastMessage ?? "No messages yet"}</p>
                </div>
                {c.unread > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                    {c.unread}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
        {selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {selected.guestName ?? selected.otherName ?? "Thread"}
                </p>
                <p className="text-xs text-gray-500">
                  {selected.type === "GUEST_SUPPORT"
                    ? selected.roomNumber
                      ? `Guest · Room ${selected.roomNumber}`
                      : "Guest"
                    : "Internal staff message"}
                </p>
              </div>
              <Badge tone={selected.type === "GUEST_SUPPORT" ? "blue" : "indigo"}>
                {selected.type === "GUEST_SUPPORT" ? "Guest support" : "Internal"}
              </Badge>
            </div>

            {showRelay && selected.type === "GUEST_SUPPORT" ? (
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Share2 className="h-4 w-4 text-gray-400" />
                  <p className="text-xs font-medium text-gray-600">Relay latest message to staff</p>
                  <div className="flex flex-1 items-center gap-2">
                    <Select
                      value={relayTarget}
                      onChange={(e) => setRelayTarget(e.target.value)}
                      className="h-8 text-xs"
                    >
                      <option value="">Select staff…</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.role.toLowerCase()}
                        </option>
                      ))}
                    </Select>
                    <Button type="button" onClick={onRelay} disabled={relaying || !relayTarget} className="h-8 text-xs">
                      {relaying ? "Relaying…" : "Relay"}
                    </Button>
                  </div>
                </div>
                {relayStatus ? (
                  <p className={cn("mt-2 text-xs", relayStatus.ok ? "text-green-700" : "text-red-600")}>
                    {relayStatus.text}
                  </p>
                ) : null}
              </div>
            ) : null}

            <ChatThread conversationId={selected.id} currentUserId={currentUserId} />
          </>
        ) : (
          <div className="flex h-[520px] items-center justify-center">
            <p className="text-sm text-gray-400">Select a conversation to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}
