"use client";

import { useActionState, useState } from "react";
import type { SettingsResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { CURRENCIES, type Currency } from "@/lib/hotel-settings";

export function SettingsForm({
  action,
  hotelName,
  currency,
}: {
  action: (prev: SettingsResult, formData: FormData) => Promise<SettingsResult>;
  hotelName: string;
  currency: Currency;
}) {
  const [state, formAction, pending] = useActionState(action, {
    success: false,
    message: "",
  });
  const [code, setCode] = useState(currency.code);
  const selected = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];

  return (
    <form action={formAction} className="max-w-lg space-y-5">
      {state.message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="hotelName">Hotel name</Label>
        <Input
          id="hotelName"
          name="hotelName"
          defaultValue={hotelName}
          placeholder="e.g. Kate Court Apartment"
          required
        />
        <p className="text-xs text-gray-500">
          Shown on receipts, the PDF shift report and the login page.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select
          id="currency"
          name="currency"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-gray-500">
          Amounts will display as e.g.{" "}
          <span className="font-mono">
            {selected.symbol}4,500
          </span>{" "}
          across dashboards, receipts and reports.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
