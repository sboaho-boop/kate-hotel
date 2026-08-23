import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHotelSettings } from "@/lib/hotel-settings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TR, TD } from "@/components/ui/table";
import { CreateRoomForm } from "./create-room-form";
import { RoomRow, RoomTableHeader } from "./edit-room-form";
import { createRoom, updateRoom, updateRoomStatus } from "./actions";

export const metadata: Metadata = { title: "Rooms | Hotel HMS" };

export default async function RoomsPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const [rooms, settings] = await Promise.all([
    prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
    getHotelSettings(),
  ]);
  const createRoomAction = createRoom.bind(null, actorId);
  const updateRoomAction = updateRoom.bind(null, actorId);

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
            <RoomTableHeader />
            <tbody>
              {rooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={{
                    id: room.id,
                    number: room.number,
                    floor: room.floor,
                    type: room.type,
                    capacity: room.capacity,
                    price: room.price,
                    status: room.status,
                  }}
                  currencySymbol={settings.currency.symbol}
                  updateRoomAction={updateRoomAction}
                  updateStatusAction={updateRoomStatus.bind(null, actorId, room.id)}
                />
              ))}
              {rooms.length === 0 ? (
                <TR>
                  <TD colSpan={8} className="py-8 text-center text-gray-400">
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
