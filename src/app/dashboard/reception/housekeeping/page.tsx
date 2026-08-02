import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignTask } from "@/app/dashboard/actions";
import { HousekeepingAssignForm } from "@/app/dashboard/reception/housekeeping/housekeeping-assign-form";
import { TaskStatusButton } from "@/components/task-status-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export const metadata: Metadata = { title: "Housekeeping | Hotel HMS" };
export const dynamic = "force-dynamic";

const statusTone: Record<string, "amber" | "blue" | "green"> = {
  PENDING: "amber",
  IN_PROGRESS: "blue",
  DONE: "green",
};

export default async function ReceptionHousekeepingPage() {
  const session = await getServerSession(authOptions);

  const [rooms, cleaners, tasks] = await Promise.all([
    prisma.room.findMany({ orderBy: { number: "asc" } }),
    prisma.user.findMany({
      where: { role: "CLEANER", isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.housekeepingTask.findMany({
      orderBy: { taskDate: "desc" },
      take: 30,
      include: { room: true, assignedTo: true, assignedBy: true },
    }),
  ]);

  const boundAssign = assignTask.bind(null, session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
        <p className="text-sm text-gray-500">
          Assign cleaning tasks to your cleaners. A room can only receive one task per day.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign a task</CardTitle>
        </CardHeader>
        <CardContent>
          <HousekeepingAssignForm
            action={boundAssign}
            rooms={rooms.map((r) => ({ id: r.id, number: r.number, floor: r.floor, status: r.status }))}
            cleaners={cleaners.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Room</TH>
                <TH>Cleaner</TH>
                <TH>Assigned by</TH>
                <TH>Notes</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <tbody>
              {tasks.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-gray-400">
                    No tasks yet. Assign the first one above.
                  </TD>
                </TR>
              ) : (
                tasks.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">Room {t.room.number}</TD>
                    <TD>{t.assignedTo.name}</TD>
                    <TD>{t.assignedBy.name}</TD>
                    <TD className="max-w-[200px] truncate text-gray-500">{t.notes ?? "—"}</TD>
                    <TD>
                      <Badge tone={statusTone[t.status]}>{t.status.replace("_", " ")}</Badge>
                    </TD>
                    <TD>
                      {t.status === "PENDING" || t.status === "IN_PROGRESS" ? (
                        <TaskStatusButton
                          userId={session!.user.id}
                          taskId={t.id}
                          status="DONE"
                          label="Mark done"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t.completedAt ? new Date(t.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
