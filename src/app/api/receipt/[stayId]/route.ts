import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { hotelConfig } from "@/lib/sms";
import { getHotelSettings } from "@/lib/hotel-settings";
import { buildReceiptText, type ReceiptData } from "@/lib/receipt";

const methodLabel: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOBILE: "Mobile money",
  OTHER: "Other",
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ stayId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(session.user.role, ["SUPER_ADMIN", "ADMIN", "RECEPTION"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { stayId } = await ctx.params;
  const stay = await prisma.stay.findUnique({
    where: { id: stayId },
    include: {
      guest: true,
      room: true,
      nfcCard: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!stay) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cfg = hotelConfig();
  const settings = await getHotelSettings();
  const paidTotal = stay.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const dueTotal = stay.payments
    .filter((p) => p.status === "UNPAID")
    .reduce((sum, p) => sum + p.amount, 0);

  const checkoutDate = stay.checkOutAt ?? stay.expectedCheckOutAt ?? stay.checkInAt;
  const nightsStayed = Math.max(
    1,
    Math.ceil(
      (checkoutDate.getTime() - stay.checkInAt.getTime()) / 86400000
    )
  );
  const dateOnly = (d: Date) =>
    d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

  const data: ReceiptData = {
    hotelName: settings.name,
    wifiSsid: cfg.wifiSsid,
    wifiPassword: cfg.wifiPassword,
    receiptNo: stay.id.slice(-8).toUpperCase(),
    issuedAt: new Date().toLocaleString("en-GB"),
    stayStatus: stay.status,
    guestName: stay.guest.name,
    guestPhone: stay.guest.phone,
    guestNationalId: stay.guest.nationalId,
    roomNumber: stay.room.number,
    roomType: stay.room.type,
    roomRate: stay.room.price,
    checkInAt: stay.checkInAt.toLocaleString("en-GB"),
    checkoutAt: dateOnly(checkoutDate) + (stay.checkOutAt ? "" : " (expected)"),
    durationLabel: `${nightsStayed} night${nightsStayed === 1 ? "" : "s"}`,
    nfcCardUid: stay.nfcCard?.uid ?? null,
    payments: stay.payments.map((p) => ({
      method: p.method,
      methodLabel: methodLabel[p.method] ?? p.method,
      amount: p.amount,
      status: p.status,
      reference: p.reference,
    })),
    paidTotal,
    dueTotal,
    currencySymbol: settings.currency.symbol,
  };

  const widthParam = Number(req.nextUrl.searchParams.get("width") ?? "48");
  const width = widthParam === 32 ? 32 : 48;

  return NextResponse.json({
    ...data,
    text: buildReceiptText(data, width),
  });
}
