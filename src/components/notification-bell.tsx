"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
};

export function NotificationBell({ href }: { href: string }) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount: number; items: NotificationItem[] };
      setUnread(data.unreadCount);
      setItems(data.items);
    } catch {
      /* ignore poll errors */
    }
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 20000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No notifications yet.</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={`border-b border-gray-50 px-4 py-3 ${n.read ? "" : "bg-indigo-50/40"}`}>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs text-gray-500">{n.body}</p> : null}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
