import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { Users, BedDouble, CreditCard, UserCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Dashboard | Hotel HMS" };

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  const [staffCount, onDutyCount, roomCount, availableCount, cardCount, assignedCards] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["ADMIN", "RECEPTION", "CLEANER"] } } }),
    prisma.user.count({ where: { role: { in: ["RECEPTION", "CLEANER"] }, isOnDuty: true } }),
    prisma.room.count(),
    prisma.room.count({ where: { status: "AVAILABLE" } }),
    prisma.nfcCard.count(),
    prisma.nfcCard.count({ where: { status: "ASSIGNED" } }),
  ]);

  const quickLinks = [
    { href: "/dashboard/admin/staff", label: "Staff accounts", desc: "Create and manage staff", icon: Users },
    { href: "/dashboard/admin/rooms", label: "Rooms", desc: "Add rooms and change status", icon: BedDouble },
    { href: "/dashboard/admin/cards", label: "NFC cards", desc: "Issue cards to rooms", icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {session!.user.name}</h1>
        <p className="text-sm text-gray-500">Hotel operations at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff" value={staffCount} icon={<Users className="h-5 w-5" />} />
        <StatCard label="On duty now" value={onDutyCount} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Rooms" value={roomCount} hint={`${availableCount} available`} icon={<BedDouble className="h-5 w-5" />} />
        <StatCard label="NFC cards" value={`${assignedCards}/${cardCount}`} hint="assigned / total" icon={<CreditCard className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <q.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{q.label}</p>
                  <p className="text-xs text-gray-500">{q.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next up in later phases</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          Check-in flow, SMS notifications, housekeeping task assignment, guest chat, and automated end-of-shift PDF
          reports will be added on top of this foundation.
        </CardContent>
      </Card>
    </div>
  );
}
