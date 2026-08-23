import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { sendSms, hotelConfig } from "@/lib/sms";

/**
 * Daily cron (see vercel.json): reminds guests and reception about
 * upcoming checkouts so they can prepare or extend the stay.
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    req.nextUrl.searchParams.get("secret")?.trim();

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 48 * 3600000);

  const stays = await prisma.stay.findMany({
    where: {
      status: "CHECKED_IN",
      expectedCheckOutAt: { gte: now, lte: windowEnd },
      checkoutReminderSentAt: null,
    },
    include: {
      guest: true,
      room: true,
    },
  });

  const hotel = hotelConfig().name;
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["RECEPTION", "ADMIN", "SUPER_ADMIN"] },
      isActive: true,
    },
    select: { id: true },
  });

  let smsSent = 0;
  const dateFmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  for (const stay of stays) {
    const checkoutLabel = dateFmt(stay.expectedCheckOutAt!);
    const isToday = new Date(stay.expectedCheckOutAt!).toDateString() === now.toDateString();
    const when = isToday ? "today" : "tomorrow";

    if (stay.guest.phone) {
      const result = await sendSms({
        phone: stay.guest.phone,
        message: `Dear ${stay.guest.name}, your checkout from ${hotel} is ${when} (${checkoutLabel}). Need to extend your stay? Contact reception. Thank you for staying with us!`,
        stayId: stay.id,
        sentById: undefined,
      });
      if (result.status === "SENT" || result.simulated) smsSent++;
    }

    for (const s of staff) {
      await notifyUser({
        userId: s.id,
        type: "CHECKOUT_REMINDER",
        title: `Checkout ${when}: Room ${stay.room.number}`,
        body: `${stay.guest.name} is due to check out on ${checkoutLabel}. Prepare the bill or confirm an extension.`,
      });
    }

    await prisma.stay.update({
      where: { id: stay.id },
      data: { checkoutReminderSentAt: now },
    });
  }

  return NextResponse.json({
    ok: true,
    checked: stays.length,
    reminded: stays.length,
    smsSent,
    runsAt: now.toISOString(),
  });
}
