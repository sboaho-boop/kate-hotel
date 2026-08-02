"use client";

import { useState } from "react";
import { setTaskStatus } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function TaskStatusButton({
  userId,
  taskId,
  status,
  label,
}: {
  userId: string;
  taskId: string;
  status: "IN_PROGRESS" | "DONE";
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onClick() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await setTaskStatus(userId, taskId, status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
