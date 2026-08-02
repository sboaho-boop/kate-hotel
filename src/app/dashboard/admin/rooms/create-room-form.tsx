"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";

const TYPE_OPTIONS = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN", label: "Twin" },
  { value: "SUITE", label: "Suite" },
  { value: "FAMILY", label: "Family" },
  { value: "DELUXE", label: "Deluxe" },
];

export function CreateRoomForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="number">Room number</Label>
          <Input id="number" name="number" placeholder="e.g. 105" required />
          <FieldError message={state.fieldErrors?.number} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floor">Floor</Label>
          <Input id="floor" name="floor" type="number" min={0} defaultValue={1} required />
          <FieldError message={state.fieldErrors?.floor} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Room type</Label>
          <Select id="type" name="type" defaultValue="SINGLE">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.type} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={1} required />
          <FieldError message={state.fieldErrors?.capacity} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price per night</Label>
          <Input id="price" name="price" type="number" step="0.01" min={0} required />
          <FieldError message={state.fieldErrors?.price} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create room"}
      </Button>
    </form>
  );
}
