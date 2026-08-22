import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export const CURRENCIES: Currency[] = [
  { code: "KES", symbol: "KSh ", name: "Kenyan Shilling" },
  { code: "UGX", symbol: "USh ", name: "Ugandan Shilling" },
  { code: "TZS", symbol: "TSh ", name: "Tanzanian Shilling" },
  { code: "RWF", symbol: "FRw ", name: "Rwandan Franc" },
  { code: "NGN", symbol: "₦ ", name: "Nigerian Naira" },
  { code: "GHS", symbol: "GH₵ ", name: "Ghanaian Cedi" },
  { code: "ZAR", symbol: "R ", name: "South African Rand" },
  { code: "ZMW", symbol: "ZK ", name: "Zambian Kwacha" },
  { code: "ETB", symbol: "Br ", name: "Ethiopian Birr" },
  { code: "XOF", symbol: "CFA ", name: "West African CFA" },
  { code: "USD", symbol: "$ ", name: "US Dollar" },
  { code: "GBP", symbol: "£ ", name: "British Pound" },
  { code: "EUR", symbol: "€ ", name: "Euro" },
];

const SETTING_KEYS = {
  hotelName: "hotelName",
  currency: "currency",
} as const;

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

function findCurrency(code: string | null): Currency {
  return (
    CURRENCIES.find((c) => c.code === (code ?? "").toUpperCase()) ??
    CURRENCIES[0]
  );
}

/**
 * Hotel-wide settings stored in the DB (editable by admins),
 * falling back to env vars and then defaults.
 */
export async function getHotelSettings(): Promise<{
  name: string;
  currency: Currency;
}> {
  const [name, currencyCode] = await Promise.all([
    getSetting(SETTING_KEYS.hotelName),
    getSetting(SETTING_KEYS.currency),
  ]);

  return {
    name: name || process.env.HOTEL_NAME || "Hotel",
    currency: findCurrency(currencyCode),
  };
}

export function formatMoney(amount: number, currency: Currency): string {
  return `${currency.symbol}${amount.toLocaleString("en-US")}`;
}

export async function setSettings(values: {
  hotelName?: string;
  currency?: string;
}): Promise<void> {
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (values.hotelName !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.hotelName },
        update: { value: values.hotelName },
        create: { key: SETTING_KEYS.hotelName, value: values.hotelName },
      })
    );
  }
  if (values.currency !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: SETTING_KEYS.currency },
        update: { value: values.currency.toUpperCase() },
        create: { key: SETTING_KEYS.currency, value: values.currency.toUpperCase() },
      })
    );
  }
  await prisma.$transaction(ops);
}
