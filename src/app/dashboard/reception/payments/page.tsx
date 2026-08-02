import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { settlePayment } from "../actions";

export const metadata: Metadata = { title: "Payments | Hotel HMS" };

const methodLabel: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile money",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const payments = await prisma.payment.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { stay: { include: { guest: { select: { name: true } }, room: { select: { number: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-500">Recorded payments and outstanding balances.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent payments ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Time</TH>
                <TH>Guest</TH>
                <TH>Room</TH>
                <TH>Method</TH>
                <TH>Amount</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="text-xs text-gray-500">{p.createdAt.toLocaleString()}</TD>
                  <TD className="font-medium text-gray-900">{p.stay.guest.name}</TD>
                  <TD>Room {p.stay.room.number}</TD>
                  <TD>{methodLabel[p.method] ?? p.method}</TD>
                  <TD className="font-medium">KES {p.amount.toLocaleString()}</TD>
                  <TD>
                    <Badge tone={p.status === "PAID" ? "green" : "red"}>{p.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    {p.status === "UNPAID" ? (
                      <form action={settlePayment.bind(null, actorId, p.id)}>
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                        >
                          Mark paid
                        </button>
                      </form>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TD>
                </TR>
              ))}
              {payments.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="py-8 text-center text-gray-400">
                    No payments recorded yet.
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
