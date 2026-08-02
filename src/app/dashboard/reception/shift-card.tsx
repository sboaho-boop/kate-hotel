"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/app/dashboard/reception/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function ShiftCard({
  activeShift,
  startShiftAction,
  endShiftAction,
}: {
  activeShift: { id: string; startedAt: Date } | null;
  startShiftAction: (formData: FormData) => void;
  endShiftAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, pending] = useActionState(endShiftAction, { success: false, message: "" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeShift ? (
          <>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <p className="text-sm text-gray-700">
                Shift active since <span className="font-medium">{activeShift.startedAt.toLocaleString()}</span>
              </p>
            </div>
            {state.message ? (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {state.message}
              </div>
            ) : null}
            <form action={formAction}>
              <Button type="submit" variant="danger" disabled={pending}>
                {pending ? "Generating report…" : "End shift & generate report"}
              </Button>
            </form>
            <p className="text-xs text-gray-500">
              A PDF report of check-ins, payments and unpaid guests will be created and sent to Admin.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700">You are not on duty. Start your shift to begin checking in guests.</p>
            <form action={startShiftAction}>
              <Button type="submit">Start shift</Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
