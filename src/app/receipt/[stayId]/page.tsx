import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { hotelConfig } from "@/lib/sms";
import { getHotelSettings } from "@/lib/hotel-settings";
import { roomTypeLabel } from "@/lib/room-types";
import { ReceiptActions } from "./receipt-actions";

export const metadata: Metadata = { title: "Receipt | Hotel HMS" };

const PAPER_WIDTH_MM = 80;

const methodLabel: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile money",
  OTHER: "Other",
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ stayId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!requireRole(session.user.role, ["SUPER_ADMIN", "ADMIN", "RECEPTION"])) {
    redirect("/login");
  }

  const [{ stayId }, sp] = await Promise.all([params, searchParams]);
  const autoPrint = sp.auto === "1";

  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: {
      guest: true,
      room: true,
      nfcCard: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!stay) notFound();

  const cfg = hotelConfig();
  const settings = await getHotelSettings();
  const cur = settings.currency;
  const money = (n: number) => `${cur.symbol}${n.toLocaleString()}`;
  const paidTotal = stay.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const dueTotal = stay.payments
    .filter((p) => p.status === "UNPAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const checkoutDate = stay.checkOutAt ?? stay.expectedCheckOutAt ?? stay.checkInAt;
  const nightsStayed = Math.max(
    1,
    Math.ceil((checkoutDate.getTime() - stay.checkInAt.getTime()) / 86400000)
  );
  const dateOnly = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="receipt-screen min-h-screen bg-gray-200 py-6">
      <style>{`
        @media print {
          @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 0; }
          html, body { width: ${PAPER_WIDTH_MM}mm; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .no-print { display: none !important; }
          .receipt-paper { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          .receipt-screen { background: #fff !important; padding: 0 !important; min-height: auto !important; }
        }
        .toolbar button { -webkit-print-color-adjust: exact; }
      `}</style>

      <ReceiptActions stayId={stay.id} autoPrint={autoPrint} />

      <div
        className="receipt-paper mx-auto w-[340px] max-w-[92vw] bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-gray-900 shadow-lg"
        style={{ minWidth: 260 }}
      >
        <div className="text-center">
          <p className="text-[15px] font-bold uppercase tracking-wide">{settings.name}</p>
          <p className="mt-0.5">*** GUEST RECEIPT ***</p>
        </div>

        <p className="my-3 text-center tracking-[4px]">- - - - - - - - - - -</p>

        <table className="w-full">
          <tbody>
            <tr>
              <td className="align-top pr-2 whitespace-nowrap">Receipt No:</td>
              <td className="text-right font-bold break-all">
                {stay.id.slice(-8).toUpperCase()}
              </td>
            </tr>
            <tr>
              <td className="align-top pr-2 whitespace-nowrap">Issued:</td>
              <td className="text-right">{new Date().toLocaleString()}</td>
            </tr>
            <tr>
              <td className="align-top pr-2 whitespace-nowrap">Status:</td>
              <td className="text-right font-bold">{stay.status.replace("_", "-")}</td>
            </tr>
          </tbody>
        </table>

        <p className="my-3 text-center tracking-[4px]">- - - - - - - - - - -</p>

        <p className="font-bold uppercase">Guest details</p>
        <p>Name: {stay.guest.name}</p>
        {stay.guest.phone ? <p>Phone: {stay.guest.phone}</p> : null}
        {stay.guest.nationalId ? <p>ID No: {stay.guest.nationalId}</p> : null}

        <p className="mt-3 font-bold uppercase">Stay</p>
        <p>
          Room: {stay.room.number} ({roomTypeLabel(stay.room.type)})
        </p>
        <p>Room rate: {money(stay.room.price)} / night</p>
        <p>Checked in: {stay.checkInAt.toLocaleString()}</p>
        <p>
          Checkout: {dateOnly(checkoutDate)}
          {stay.checkOutAt ? "" : " (expected)"}
        </p>
        <p>
          Duration: {nightsStayed} night{nightsStayed === 1 ? "" : "s"}
        </p>
        {stay.nfcCard ? <p>Key card: {stay.nfcCard.uid}</p> : null}

        <p className="my-3 text-center tracking-[4px]">- - - - - - - - - - -</p>

        <p className="font-bold uppercase">Payments</p>
        {stay.payments.length === 0 ? (
          <p>No payments recorded.</p>
        ) : (
          <table className="mt-1 w-full">
            <thead>
              <tr className="border-b border-dashed border-gray-400">
                <th className="text-left font-normal">Method</th>
                <th className="text-right font-normal">Amt</th>
                <th className="text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {stay.payments.map((p) => (
                <tr key={p.id} className="border-b border-dashed border-gray-200">
                  <td className="py-0.5">
                    {methodLabel[p.method] ?? p.method}
                    {p.reference ? (
                      <span className="block text-[9px]">Ref: {p.reference}</span>
                    ) : null}
                  </td>
                  <td className="py-0.5 text-right">{money(p.amount)}</td>
                  <td className={`py-0.5 text-right ${p.status === "PAID" ? "" : "font-bold"}`}>
                    {p.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <table className="mt-2 w-full border-t border-black pt-1">
          <tbody>
            <tr>
              <td>Total paid:</td>
              <td className="text-right font-bold">{money(paidTotal)}</td>
            </tr>
            {dueTotal > 0 ? (
              <tr>
                <td className="font-bold uppercase">Balance due:</td>
                <td className="text-right font-bold">{money(dueTotal)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <p className="my-3 text-center tracking-[4px]">- - - - - - - - - - -</p>

        <div className="text-center">
          <p className="font-bold">Free WiFi</p>
          <p>
            {cfg.wifiSsid} &nbsp;/&nbsp; {cfg.wifiPassword}
          </p>
          <p className="mt-3">Thank you for staying with us!</p>
          <p className="mt-1">{settings.name}</p>
          <p className="mt-3 text-[9px]">Powered by Hotel HMS</p>
        </div>
      </div>
    </div>
  );
}
