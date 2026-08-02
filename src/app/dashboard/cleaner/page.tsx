import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { TaskStatusButton } from "@/components/task-status-button";

export const metadata: Metadata = { title: "My Tasks | Hotel HMS" };
export const dynamic = "force-dynamic";

const statusTone: Record<string, "amber" | "blue" | "green"> = {
  PENDING: "amber",
  IN_PROGRESS: "blue",
  DONE: "green",
};

export default async function CleanerDashboard() {
  const session = await getServerSession(authOptions);

  const [pendingCount, doneCount, tasks] = await Promise.all([
    prisma.housekeepingTask.count({ where: { assignedToId: session!.user.id, status: { not: "DONE" } } }),
    prisma.housekeepingTask.count({ where: { assignedToId: session!.user.id, status: "DONE" } }),
    prisma.housekeepingTask.findMany({
      where: { assignedToId: session!.user.id },
      orderBy: { taskDate: "desc" },
      take: 20,
      include: { room: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500">Hi {session!.user.name}, here is what the reception has assigned you.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Pending tasks" value={pendingCount} icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Completed" value={doneCount} icon={<Sparkles className="h-5 w-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Room</TH>
                <TH>Notes</TH>
                <TH>Assigned</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <tbody>
              {tasks.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-gray-400">
                    No tasks assigned yet. Your assignments will show up here.
                  </TD>
                </TR>
              ) : (
                tasks.map((t) => (
                  <TR key={t.id}>
                    <TD className="font-medium">Room {t.room.number}</TD>
                    <TD className="max-w-[220px] truncate text-gray-500">{t.notes ?? "—"}</TD>
                    <TD className="text-gray-500">
                      {t.taskDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TD>
                    <TD>
                      <Badge tone={statusTone[t.status]}>{t.status.replace("_", " ")}</Badge>
                    </TD>
                    <TD className="space-x-2">
                      {t.status === "PENDING" ? (
                        <TaskStatusButton
                          userId={session!.user.id}
                          taskId={t.id}
                          status="IN_PROGRESS"
                          label="Start"
                        />
                      ) : null}
                      {t.status !== "DONE" ? (
                        <TaskStatusButton
                          userId={session!.user.id}
                          taskId={t.id}
                          status="DONE"
                          label={t.status === "IN_PROGRESS" ? "Mark done" : "Done"}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t.completedAt
                            ? new Date(t.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
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
