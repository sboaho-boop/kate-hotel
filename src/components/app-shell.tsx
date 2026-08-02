"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BedDouble,
  CreditCard,
  MessageSquare,
  Sparkles,
  CalendarClock,
  ClipboardList,
  Menu,
  X,
  Hotel,
  Wallet,
  FileText,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import type { RoleKey } from "@/types/next-auth";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_BY_ROLE: Record<RoleKey, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/dashboard/super-admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/super-admin/staff", label: "Staff", icon: Users },
    { href: "/dashboard/super-admin/rooms", label: "Rooms", icon: BedDouble },
    { href: "/dashboard/super-admin/cards", label: "NFC Cards", icon: CreditCard },
    { href: "/dashboard/super-admin/reports", label: "Shift Reports", icon: FileText },
    { href: "/dashboard/super-admin/chats", label: "Chats", icon: MessageSquare },
    { href: "/dashboard/super-admin/housekeeping", label: "Housekeeping", icon: ClipboardList },
    { href: "/dashboard/super-admin/notifications", label: "Notifications", icon: Bell },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/admin/staff", label: "Staff", icon: Users },
    { href: "/dashboard/admin/rooms", label: "Rooms", icon: BedDouble },
    { href: "/dashboard/admin/cards", label: "NFC Cards", icon: CreditCard },
    { href: "/dashboard/admin/reports", label: "Shift Reports", icon: FileText },
    { href: "/dashboard/admin/chats", label: "Chats", icon: MessageSquare },
    { href: "/dashboard/admin/housekeeping", label: "Housekeeping", icon: ClipboardList },
    { href: "/dashboard/admin/notifications", label: "Notifications", icon: Bell },
  ],
  RECEPTION: [
    { href: "/dashboard/reception", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/reception/checkin", label: "Check-in", icon: CalendarClock },
    { href: "/dashboard/reception/payments", label: "Payments", icon: Wallet },
    { href: "/dashboard/reception/housekeeping", label: "Housekeeping", icon: ClipboardList },
    { href: "/dashboard/reception/chats", label: "Chats", icon: MessageSquare },
  ],
  CLEANER: [
    { href: "/dashboard/cleaner", label: "My Tasks", icon: Sparkles },
    { href: "/dashboard/cleaner/messages", label: "Messages", icon: MessageSquare },
  ],
  GUEST: [
    { href: "/dashboard/guest", label: "My Stay", icon: LayoutDashboard },
    { href: "/dashboard/guest/chat", label: "Chat", icon: MessageSquare },
  ],
};

export function AppShell({
  user,
  children,
}: {
  user: { id: string; name: string; email: string; role: RoleKey };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_BY_ROLE[user.role] ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Hotel className="h-5 w-5 text-indigo-600" />
          Hotel HMS
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-slate-900 text-slate-100 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
              <Hotel className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Hotel HMS</p>
              <p className="text-xs text-slate-400">Operations Console</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-500 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="mb-3">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">
                {ROLE_LABELS[user.role]} · {user.email}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-end gap-3 border-b border-gray-200 bg-white/80 px-4 py-2.5 backdrop-blur sm:px-6 lg:px-8">
          {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <NotificationBell
              href={
                user.role === "SUPER_ADMIN"
                  ? "/dashboard/super-admin/notifications"
                  : "/dashboard/admin/notifications"
              }
            />
          )}
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
