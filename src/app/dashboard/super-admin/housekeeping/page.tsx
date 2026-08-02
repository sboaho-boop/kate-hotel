import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HousekeepingOversightTable } from "@/components/housekeeping-oversight-table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Housekeeping | Hotel HMS" };
export const dynamic = "force-dynamic";

export default async function SuperAdminHousekeepingPage() {
  const session = await getServerSession(authOptions);

  const tasks = await prisma.housekeepingTask.findMany({
    orderBy: { taskDate: "desc" },
    take: 50,
    include: { room: { select: { number: true } }, assignedTo: { select: { name: true } }, assignedBy: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping oversight</h1>
        <p className="text-sm text-gray-500">All cleaning tasks across the property, newest first.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <HousekeepingOversightTable
            actorId={session!.user.id}
            tasks={tasks.map((t) => ({
              id: t.id,
              roomNumber: t.room.number,
              cleaner: t.assignedTo.name,
              assignedBy: t.assignedBy.name,
              notes: t.notes,
              status: t.status,
              createdAt: t.taskDate,
              completedAt: t.completedAt,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
