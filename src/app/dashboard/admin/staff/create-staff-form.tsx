"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";

const ROLE_OPTIONS = [
  { value: "RECEPTION", label: "Receptionist" },
  { value: "CLEANER", label: "Cleaner" },
  { value: "ADMIN", label: "Admin" },
];

export function CreateStaffForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" });

  return (
    <form action={formAction} className="space-y-4">
      {state.message && !state.success ? (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</div>
      ) : null}
      {state.message && state.success ? (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Jane Doe" required />
          <FieldError message={state.fieldErrors?.name} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="jane@hotel.com" required />
          <FieldError message={state.fieldErrors?.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" placeholder="+254 7XX XXX XXX" />
          <FieldError message={state.fieldErrors?.phone} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="password" placeholder="min. 6 characters" required />
          <FieldError message={state.fieldErrors?.password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="RECEPTION">
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <FieldError message={state.fieldErrors?.role} />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create staff account"}
      </Button>
    </form>
  );
}
