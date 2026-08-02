"use client";

import { usePathname } from "next/navigation";
import { Moon } from "lucide-react";
import type { RoleKey } from "@/types/next-auth";

export function DutyGate({
  role,
  home,
  onDuty,
  children,
}: {
  role: RoleKey;
  home: string;
  onDuty: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isStaffShiftRole = role === "RECEPTION" || role === "CLEANER";
  if (!isStaffShiftRole || onDuty || pathname === home) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <Moon className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">You are off duty</h2>
        <p className="mt-2 text-sm text-gray-500">
          Staff can only use the system while on duty. Ask your Admin to mark you on duty, or visit your dashboard to
          start a shift.
        </p>
      </div>
    </div>
  );
}
