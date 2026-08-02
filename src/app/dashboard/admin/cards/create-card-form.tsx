"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/field";

export function CreateCardForm({ action }: { action: (prev: ActionResult, formData: FormData) => Promise<ActionResult> }) {
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="uid">Card UID / serial</Label>
          <Input id="uid" name="uid" placeholder="e.g. NFC-2026-0001 or scanned value" required />
          <FieldError message={state.fieldErrors?.uid} />
        </div>
        <Button type="submit" disabled={pending} className="sm:mb-0.5">
          {pending ? "Registering…" : "Register card"}
        </Button>
      </div>
    </form>
  );
}
