import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { CreateCardForm } from "./create-card-form";
import { createCard, assignCard, revokeCard } from "./actions";

export const metadata: Metadata = { title: "NFC Cards | Hotel HMS" };

const statusTone: Record<string, "gray" | "green" | "red"> = {
  UNASSIGNED: "gray",
  ASSIGNED: "green",
  REVOKED: "red",
};

export default async function CardsPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const cards = await prisma.nfcCard.findMany({
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });
  const rooms = await prisma.room.findMany({
    where: { status: { not: "MAINTENANCE" } },
    orderBy: { number: "asc" },
  });
  const createCardAction = createCard.bind(null, actorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NFC Door Cards</h1>
        <p className="text-sm text-gray-500">
          Issue and manage NFC cards. Cards link to rooms for door access (hardware integration comes later).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Register a card</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCardForm action={createCardAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cards ({cards.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Card UID</TH>
                <TH>Status</TH>
                <TH>Assigned to</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {cards.map((card) => (
                <TR key={card.id}>
                  <TD className="font-mono text-sm font-medium text-gray-900">{card.uid}</TD>
                  <TD>
                    <Badge tone={statusTone[card.status]}>{card.status}</Badge>
                  </TD>
                  <TD>
                    {card.room ? (
                      <span className="font-medium">Room {card.room.number}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {card.status !== "ASSIGNED" ? (
                        <form action={assignCard.bind(null, actorId, card.id)} className="inline-flex items-center gap-2">
                          <select
                            name="roomId"
                            defaultValue=""
                            required
                            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-700"
                          >
                            <option value="" disabled>
                              Assign room…
                            </option>
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                Room {r.number}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          >
                            Assign
                          </button>
                        </form>
                      ) : (
                        <form action={revokeCard.bind(null, actorId, card.id)}>
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        </form>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
              {cards.length === 0 ? (
                <TR>
                  <TD colSpan={4} className="py-8 text-center text-gray-400">
                    No NFC cards registered.
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
