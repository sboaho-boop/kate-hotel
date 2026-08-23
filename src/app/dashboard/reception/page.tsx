import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { CalendarCheck, BedDouble, Wallet, ClipboardList } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShiftCard } from "./shift-card";
import { startShift, endShift } from "./actions";

export const metadata: Metadata = { title: "Reception Dashboard | Hotel HMS" };

export default async function ReceptionDashboard() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const [availableRooms, checkedIn, unpaidStays, activeShift, cleaningRooms, lastClosedShift] = await Promise.all([
    prisma.room.count({ where: { status: "AVAILABLE" } }),
    prisma.stay.count({ where: { status: "CHECKED_IN" } }),
    prisma.payment.findMany({ where: { status: "UNPAID" }, select: { stayId: true } }).then((p) => new Set(p.map((x) => x.stayId)).size),
    prisma.shift.findFirst({ where: { userId: actorId, status: "ACTIVE" }, orderBy: { startedAt: "desc" } }),
    prisma.room.count({ where: { status: "CLEANING" } }),
    prisma.shift.findFirst({
      where: { userId: actorId, status: "CLOSED" },
      orderBy: { endedAt: "desc" },
      select: { id: true, endedAt: true },
    }),
  ]);

  const startShiftAction = startShift.bind(null, actorId);
  const endShiftAction = endShift.bind(null, actorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reception Desk</h1>
        <p className="text-sm text-gray-500">Welcome, {session!.user.name}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available rooms" value={availableRooms} icon={<BedDouble className="h-5 w-5" />} />
        <StatCard label="Guests in-house" value={checkedIn} icon={<CalendarCheck className="h-5 w-5" />} />
        <StatCard label="Unpaid guests" value={unpaidStays} icon={<Wallet className="h-5 w-5" />} />
        <StatCard label="Rooms in cleaning" value={cleaningRooms} icon={<ClipboardList className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ShiftCard
          activeShift={activeShift}
          lastClosedShift={lastClosedShift}
          startShiftAction={startShiftAction}
          endShiftAction={endShiftAction}
        />
        <Card>
          <CardHeader>
            <CardTitle>Housekeeping</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Assign cleaning tasks to housekeeping staff. This module ships in Phase 3.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
