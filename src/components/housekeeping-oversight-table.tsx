import { TaskStatusButton } from "@/components/task-status-button";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

const statusTone: Record<string, "amber" | "blue" | "green"> = {
  PENDING: "amber",
  IN_PROGRESS: "blue",
  DONE: "green",
};

export type OversightTask = {
  id: string;
  roomNumber: string;
  cleaner: string;
  assignedBy: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  completedAt: Date | null;
};

export function HousekeepingOversightTable({
  tasks,
  actorId,
}: {
  tasks: OversightTask[];
  actorId: string;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Room</TH>
          <TH>Cleaner</TH>
          <TH>Assigned by</TH>
          <TH>Notes</TH>
          <TH>Created</TH>
          <TH>Status</TH>
          <TH>Actions</TH>
        </TR>
      </THead>
      <tbody>
        {tasks.length === 0 ? (
          <TR>
            <TD colSpan={7} className="py-8 text-center text-gray-400">
              No housekeeping tasks recorded yet.
            </TD>
          </TR>
        ) : (
          tasks.map((t) => (
            <TR key={t.id}>
              <TD className="font-medium">Room {t.roomNumber}</TD>
              <TD>{t.cleaner}</TD>
              <TD>{t.assignedBy}</TD>
              <TD className="max-w-[200px] truncate text-gray-500">{t.notes ?? "—"}</TD>
              <TD className="text-gray-500">
                {t.createdAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </TD>
              <TD>
                <Badge tone={statusTone[t.status]}>{t.status.replace("_", " ")}</Badge>
              </TD>
              <TD>
                {t.status !== "DONE" ? (
                  <TaskStatusButton userId={actorId} taskId={t.id} status="DONE" label="Mark done" />
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
  );
}
