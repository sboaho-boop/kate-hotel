import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHotelSettings } from "@/lib/hotel-settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { CheckInForm } from "./check-in-form";
import { checkInGuest, checkOut, settlePayment, flagUnpaid, unflagUnpaid } from "../actions";

export const metadata: Metadata = { title: "Check-in | Hotel HMS" };

const statusTone = (paid: boolean) => (paid ? "green" : "red");

export default async function CheckInPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const [rooms, cards, stays, flagLogs, settings] = await Promise.all([
    prisma.room.findMany({ where: { status: "AVAILABLE" }, orderBy: { number: "asc" } }),
    prisma.nfcCard.findMany({
      where: { status: { in: ["UNASSIGNED", "ASSIGNED"] } },
      orderBy: { uid: "asc" },
    }),
    prisma.stay.findMany({
      where: { status: "CHECKED_IN" },
      include: {
        guest: { select: { name: true, phone: true } },
        room: { select: { number: true } },
        nfcCard: { select: { uid: true } },
        payments: true,
      },
      orderBy: { checkInAt: "desc" },
    }),
    prisma.checkInLog.findMany({
      where: { action: { in: ["TRANSFER_FLAG", "TRANSFER_UNFLAG"] } },
      orderBy: { createdAt: "desc" },
      select: { stayId: true, action: true },
    }),
    getHotelSettings(),
  ]);

  const flagMap = new Map<string, boolean>();
  for (const log of flagLogs) {
    if (!flagMap.has(log.stayId)) flagMap.set(log.stayId, log.action === "TRANSFER_FLAG");
  }

  const checkInAction = checkInGuest.bind(null, actorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Guest Check-in</h1>
        <p className="text-sm text-gray-500">Capture guest details, assign a room and NFC card, and record payment.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Check in a guest</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckInForm
            action={checkInAction}
            rooms={rooms.map((r) => ({ id: r.id, number: r.number, price: r.price }))}
            cards={cards.map((c) => ({ id: c.id, uid: c.uid, roomId: c.roomId }))}
            currency={settings.currency}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currently checked in ({stays.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Guest</TH>
                <TH>Room</TH>
                <TH>NFC card</TH>
                <TH>Checked in</TH>
                <TH>Payment</TH>
                <TH>Flag</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {stays.map((stay) => {
                const unpaid = stay.payments.some((p) => p.status === "UNPAID");
                const flagged = flagMap.get(stay.id) ?? false;
                const unpaidPayment = stay.payments.find((p) => p.status === "UNPAID");
                const unpaidAmount = stay.payments
                  .filter((p) => p.status === "UNPAID")
                  .reduce((sum, p) => sum + p.amount, 0);
                return (
                  <TR key={stay.id}>
                    <TD>
                      <p className="font-medium text-gray-900">{stay.guest.name}</p>
                      {stay.guest.phone ? <p className="text-xs text-gray-400">{stay.guest.phone}</p> : null}
                    </TD>
                    <TD className="font-medium">Room {stay.room.number}</TD>
                    <TD className="font-mono text-xs">{stay.nfcCard?.uid ?? "—"}</TD>
                    <TD className="text-xs text-gray-500">{stay.checkInAt.toLocaleString()}</TD>
                    <TD>
                      <Badge tone={statusTone(!unpaid)}>
                        {unpaid
                          ? `UNPAID · ${settings.currency.symbol}${unpaidAmount.toLocaleString()}`
                          : "PAID"}
                      </Badge>
                    </TD>
                    <TD>{flagged ? <Badge tone="amber">Next shift</Badge> : <span className="text-gray-300">—</span>}</TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {unpaid ? (
                          <>
                            {flagged ? (
                              <form action={unflagUnpaid.bind(null, actorId, stay.id)}>
                                <button
                                  type="submit"
                                  className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                                >
                                  Unflag
                                </button>
                              </form>
                            ) : (
                              <form action={flagUnpaid.bind(null, actorId, stay.id)}>
                                <button
                                  type="submit"
                                  className="rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                                >
                                  Flag for next shift
                                </button>
                              </form>
                            )}
                            {unpaidPayment ? (
                              <form action={settlePayment.bind(null, actorId, unpaidPayment.id)}>
                                <button
                                  type="submit"
                                  className="rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                                >
                                  Mark paid
                                </button>
                              </form>
                            ) : null}
                          </>
                        ) : null}
                        <a
                          href={`/receipt/${stay.id}?auto=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          Receipt
                        </a>
                        <form action={checkOut.bind(null, actorId, stay.id)}>
                          <button
                            type="submit"
                            className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700"
                          >
                            Check out
                          </button>
                        </form>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {stays.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-gray-400">
                    No guests currently checked in.
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
