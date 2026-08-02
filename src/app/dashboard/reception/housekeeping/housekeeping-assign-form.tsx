"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, FieldError } from "@/components/ui/field";

export type RoomOption = { id: string; number: string; floor: number; status: string };
export type CleanerOption = { id: string; name: string };

export function HousekeepingAssignForm({
  action,
  rooms,
  cleaners,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  rooms: RoomOption[];
  cleaners: CleanerOption[];
}) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" });

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="roomId">Room *</Label>
          <Select id="roomId" name="roomId" required>
            <option value="" disabled>
              Select a room…
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.number} · {r.status.toLowerCase()}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.roomId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="assignedToId">Cleaner *</Label>
          <Select id="assignedToId" name="assignedToId" required>
            <option value="" disabled>
              Select a cleaner…
            </option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.assignedToId} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" placeholder="e.g. restock amenities, deep clean" rows={3} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Assigning…" : "Assign task"}
      </Button>
    </form>
  );
}
