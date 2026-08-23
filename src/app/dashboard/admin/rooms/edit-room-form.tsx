"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/app/dashboard/admin/staff/actions";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { Pencil } from "lucide-react";

const typeLabel: Record<string, string> = {
  SINGLE: "Single",
  DOUBLE: "Double",
  TWIN: "Twin",
  SUITE: "Suite",
  FAMILY: "Family",
  DELUXE: "Deluxe",
};

const statusTone: Record<string, "green" | "gray" | "amber" | "red"> = {
  AVAILABLE: "green",
  OCCUPIED: "red",
  CLEANING: "amber",
  MAINTENANCE: "gray",
};

export function RoomRow({
  room,
  currencySymbol,
  updateRoomAction,
  updateStatusAction,
}: {
  room: {
    id: string;
    number: string;
    floor: number;
    type: string;
    capacity: number;
    price: number;
    status: string;
  };
  currencySymbol: string;
  updateRoomAction: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  updateStatusAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateRoomAction, {
    success: false,
    message: "",
  });

  return (
    <>
      <TR>
        <TD className="font-medium text-gray-900">Room {room.number}</TD>
        <TD>Floor {room.floor}</TD>
        <TD>{typeLabel[room.type] ?? room.type}</TD>
        <TD>{room.capacity}</TD>
        <TD>
          {currencySymbol}
          {room.price.toLocaleString()}
        </TD>
        <TD>
          <Badge tone={statusTone[room.status]}>{room.status}</Badge>
        </TD>
        <TD className="text-right">
          <form action={updateStatusAction} className="inline-flex items-center gap-2">
            <select
              name="status"
              defaultValue={room.status}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
            >
              {Object.keys(statusTone).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Save
            </button>
          </form>
        </TD>
        <TD className="text-right">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
              editing
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Close" : "Edit"}
          </button>
        </TD>
      </TR>
      {editing ? (
        <TR>
          <TD colSpan={8} className="bg-indigo-50/50">
            <form action={formAction} className="px-2 py-3">
              <input type="hidden" name="roomId" value={room.id} />
              {state.message ? (
                <div
                  className={`mb-3 rounded-lg px-3 py-2 text-sm ${
                    state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {state.message}
                </div>
              ) : null}
              <p className="mb-3 text-sm font-semibold text-gray-900">
                Edit Room {room.number}
              </p>
              <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600">Floor</span>
                  <input
                    type="number"
                    name="floor"
                    min={0}
                    defaultValue={room.floor}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600">Type</span>
                  <select
                    name="type"
                    defaultValue={room.type}
                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  >
                    {Object.entries(typeLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600">Capacity (guests)</span>
                  <input
                    type="number"
                    name="capacity"
                    min={1}
                    defaultValue={room.capacity}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-gray-600">
                    Price / night ({currencySymbol})
                  </span>
                  <input
                    type="number"
                    name="price"
                    min={1}
                    step="0.01"
                    defaultValue={room.price}
                    required
                    className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="mt-4 inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
            </form>
          </TD>
        </TR>
      ) : null}
    </>
  );
}

export function RoomTableHeader() {
  return (
    <THead>
      <TR>
        <TH>Room</TH>
        <TH>Floor</TH>
        <TH>Type</TH>
        <TH>Capacity</TH>
        <TH>Price/night</TH>
        <TH>Status</TH>
        <TH className="text-right">Change status</TH>
        <TH className="text-right">Edit</TH>
      </TR>
    </THead>
  );
}
