import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHotelSettings } from "@/lib/hotel-settings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { CreateRoomForm } from "./create-room-form";
import { createRoom, updateRoomStatus } from "./actions";

export const metadata: Metadata = { title: "Rooms | Hotel HMS" };

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

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const [rooms, settings] = await Promise.all([
    prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
    getHotelSettings(),
  ]);
  const createRoomAction = createRoom.bind(null, actorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
        <p className="text-sm text-gray-500">Manage rooms and their availability status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create room</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateRoomForm action={createRoomAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room list ({rooms.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Room</TH>
                <TH>Floor</TH>
                <TH>Type</TH>
                <TH>Capacity</TH>
                <TH>Price/night</TH>
                <TH>Status</TH>
                <TH className="text-right">Change status</TH>
              </TR>
            </THead>
            <tbody>
              {rooms.map((room) => (
                <TR key={room.id}>
                  <TD className="font-medium text-gray-900">Room {room.number}</TD>
                  <TD>Floor {room.floor}</TD>
                  <TD>{typeLabel[room.type]}</TD>
                  <TD>{room.capacity}</TD>
                  <TD>
                    {settings.currency.symbol}
                    {room.price.toLocaleString()}
                  </TD>
                  <TD>
                    <Badge tone={statusTone[room.status]}>{room.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <form action={updateRoomStatus.bind(null, actorId, room.id)} className="inline-flex items-center gap-2">
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
                </TR>
              ))}
              {rooms.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-gray-400">
                    No rooms yet.
                  </TD>
                </TR>
              ) : null}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
