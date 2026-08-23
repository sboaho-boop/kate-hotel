import { prisma } from "@/lib/prisma";
import { getHotelSettings } from "@/lib/hotel-settings";
import { renderShiftReportPdf, type ReportData } from "@/lib/report";
import type { Shift } from "@prisma/client";

const fmtTime = (d: Date) =>
  d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Rebuilds the full shift report dataset for any closed shift, on demand.
 */
export async function collectShiftReport(shift: Shift): Promise<ReportData> {
  const startedAt = shift.startedAt;
  const endedAt = shift.endedAt ?? new Date();

  const [checkIns, payments, unpaidStays, settings] = await Promise.all([
    prisma.stay.findMany({
      where: {
        receptionistId: shift.userId,
        checkInAt: { gte: startedAt, lte: endedAt },
      },
      include: { guest: true, room: true, nfcCard: true, payments: true },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.payment.findMany({
      where: {
        recordedById: shift.userId,
        createdAt: { gte: startedAt, lte: endedAt },
        status: "PAID",
      },
      include: { stay: { include: { guest: true, room: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.stay.findMany({
      where: { status: "CHECKED_IN" },
      include: { guest: true, room: true, payments: true },
      orderBy: { checkInAt: "asc" },
    }),
    getHotelSettings(),
  ]);

  const unpaidStaysFiltered = unpaidStays.filter((s) =>
    s.payments.some((p) => p.status === "UNPAID")
  );

  return {
    hotelName: settings.name,
    currencySymbol: settings.currency.symbol,
    staffName: (await prisma.user.findUnique({ where: { id: shift.userId } }))?.name ?? shift.userId,
    shiftId: shift.id,
    startedAt: fmtTime(startedAt),
    endedAt: fmtTime(endedAt),
    summary: {
      checkIns: checkIns.length,
      paymentsCount: payments.length,
      totalCollected: payments.reduce((sum, p) => sum + p.amount, 0),
      unpaidTotal: unpaidStaysFiltered.reduce(
        (sum, s) => sum + s.payments.filter((p) => p.status === "UNPAID").reduce((a, b) => a + b.amount, 0),
        0
      ),
    },
    checkIns: checkIns.map((s) => ({
      time: fmtTime(s.checkInAt),
      guest: s.guest.name,
      phone: s.guest.phone ?? "",
      room: s.room.number,
      card: s.nfcCard?.uid ?? null,
      amount: s.payments[0]?.amount ?? 0,
      status: s.payments.some((p) => p.status === "UNPAID") ? ("UNPAID" as const) : ("PAID" as const),
    })),
    payments: payments.map((p) => ({
      time: fmtTime(p.createdAt),
      guest: p.stay.guest.name,
      room: p.stay.room.number,
      method: p.method,
      amount: p.amount,
    })),
    unpaidGuests: unpaidStaysFiltered.map((s) => ({
      time: fmtTime(s.checkInAt),
      guest: s.guest.name,
      phone: s.guest.phone ?? "",
      room: s.room.number,
      card: null,
      amount: s.payments
        .filter((p) => p.status === "UNPAID")
        .reduce((a, b) => a + b.amount, 0),
      status: "UNPAID" as const,
    })),
  };
}

export async function renderShiftPdf(shift: Shift): Promise<Buffer> {
  return renderShiftReportPdf(await collectShiftReport(shift));
}
