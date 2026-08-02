import type { Metadata } from "next";
import { Users, BedDouble, CreditCard, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/rbac";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export const metadata: Metadata = { title: "Super Admin | Hotel HMS" };

export default async function SuperAdminDashboard() {
  const [staffCount, guestCount, roomCount, occupiedRooms, cardCount, assignedCards, recentActivity] =
    await Promise.all([
      prisma.user.count({ where: { role: { in: ["ADMIN", "RECEPTION", "CLEANER"] } } }),
      prisma.user.count({ where: { role: "GUEST" } }),
      prisma.room.count(),
      prisma.room.count({ where: { status: "OCCUPIED" } }),
      prisma.nfcCard.count(),
      prisma.nfcCard.count({ where: { status: "ASSIGNED" } }),
      prisma.auditLog.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, role: true } } },
      }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Overview</h1>
        <p className="text-sm text-gray-500">Full visibility across the entire operation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Staff" value={staffCount} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Guests" value={guestCount} icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard
          label="Rooms"
          value={`${occupiedRooms}/${roomCount}`}
          hint="occupied / total"
          icon={<BedDouble className="h-5 w-5" />}
        />
        <StatCard label="NFC cards" value={`${assignedCards}/${cardCount}`} hint="assigned / total" icon={<CreditCard className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Actor</TH>
                <TH>Action</TH>
                <TH>Entity</TH>
              </TR>
            </THead>
            <tbody>
              {recentActivity.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap text-xs text-gray-500">
                    {log.createdAt.toLocaleString()}
                  </TD>
                  <TD>
                    <span className="font-medium">{log.actor.name}</span>
                    <span className="ml-1 text-xs text-gray-400">{ROLE_LABELS[log.actor.role as keyof typeof ROLE_LABELS]}</span>
                  </TD>
                  <TD>
                    <Badge tone="gray">{log.action}</Badge>
                  </TD>
                  <TD className="text-xs text-gray-500">{log.entity}</TD>
                </TR>
              ))}
              {recentActivity.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-gray-400">
                    No activity recorded yet.
                  </TD>
                </TR>
              ) : null}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
