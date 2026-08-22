import { prisma } from "@/lib/prisma";

export type SmsResult = {
  id: string;
  status: string;
  providerRef?: string | null;
  simulated: boolean;
};

export function hotelConfig() {
  return {
    name: process.env.HOTEL_NAME || "Hotel",
    wifiSsid: process.env.HOTEL_WIFI_SSID || "Guest-WiFi",
    wifiPassword: process.env.HOTEL_WIFI_PASSWORD || "welcome123",
  };
}

/**
 * Builds the welcome SMS sent to a guest on check-in.
 */
export function welcomeSmsText(roomNumber: string): string {
  const cfg = hotelConfig();
  return [
    `Welcome to ${cfg.name}!`,
    `Your room: ${roomNumber}`,
    `Free WiFi: ${cfg.wifiSsid}`,
    `Password: ${cfg.wifiPassword}`,
    "Enjoy your stay.",
  ].join("\n");
}

/**
 * Sends an SMS via Africa's Talking when configured.
 * Otherwise it is recorded in the SmsLog as SIMULATED so the flow can be
 * developed and demoed without a paid SMS account.
 */
export async function sendSms(opts: {
  phone: string;
  message: string;
  stayId?: string;
  sentById?: string;
}): Promise<SmsResult> {
  const mnotifyKey = process.env.MNOTIFY_API_KEY?.trim();
  const atApiKey = process.env.AT_API_KEY?.trim();
  const atUsername = process.env.AT_USERNAME?.trim();

  if (!mnotifyKey && !atApiKey && !atUsername) {
    const log = await prisma.smsLog.create({
      data: {
        phone: opts.phone,
        message: opts.message,
        stayId: opts.stayId,
        sentById: opts.sentById,
        provider: "mnotify",
        status: "SIMULATED",
      },
    });
    return { id: log.id, status: "SIMULATED", simulated: true };
  }

  if (mnotifyKey) {
    return sendViaMnotify(mnotifyKey, opts);
  }
  return sendViaAfricasTalking(atApiKey!, atUsername!, opts);
}

/**
 * mNotify (Ghana) quick bulk SMS.
 * Docs: https://developer.mnotify.com/ — success response code is "2000".
 */
async function sendViaMnotify(
  apiKey: string,
  opts: { phone: string; message: string; stayId?: string; sentById?: string }
): Promise<SmsResult> {
  const sender = process.env.MNOTIFY_SENDER_ID?.trim() || "HMS";
  const digits = opts.phone.replace(/[^+\d]/g, "");
  let status = "SENT";
  let providerRef: string | null = null;

  try {
    const res = await fetch(
      `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: [digits],
          sender,
          message: opts.message,
          is_schedule: false,
          schedule_date: "",
        }),
      }
    );

    const data = (await res.json()) as {
      status?: string;
      code?: string;
      summary?: { _id?: string };
    };
    providerRef = data.summary?._id ?? null;
    if (!res.ok || data.code !== "2000") {
      status = "FAILED";
    }
  } catch {
    status = "FAILED";
  }

  const log = await prisma.smsLog.create({
    data: {
      phone: opts.phone,
      message: opts.message,
      stayId: opts.stayId,
      sentById: opts.sentById,
      provider: "mnotify",
      status,
      providerRef,
    },
  });

  return { id: log.id, status, providerRef, simulated: false };
}

/**
 * Africa's Talking fallback.
 */
async function sendViaAfricasTalking(
  apiKey: string,
  username: string,
  opts: { phone: string; message: string; stayId?: string; sentById?: string }
): Promise<SmsResult> {
  let status = "SENT";
  let providerRef: string | null = null;

  try {
    const params = new URLSearchParams();
    params.set("username", username);
    params.set("to", opts.phone);
    params.set("message", opts.message);

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await res.json()) as {
      SMSMessageData?: { Message?: string; Recipients?: { status?: string }[] };
    };
    providerRef = data.SMSMessageData?.Recipients?.[0]?.status ?? null;
    if (!res.ok || data.SMSMessageData?.Message !== "Success") {
      status = "FAILED";
    }
  } catch {
    status = "FAILED";
  }

  const log = await prisma.smsLog.create({
    data: {
      phone: opts.phone,
      message: opts.message,
      stayId: opts.stayId,
      sentById: opts.sentById,
      provider: "africastalking",
      status,
      providerRef,
    },
  });

  return { id: log.id, status, providerRef, simulated: false };
}
