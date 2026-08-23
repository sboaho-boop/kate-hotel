"use client";

import { useActionState, useState } from "react";
import type { ActionResult } from "@/app/dashboard/reception/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, FieldError } from "@/components/ui/field";
import type { Currency } from "@/lib/hotel-settings";

export type RoomOption = { id: string; number: string; price: number };
export type CardOption = { id: string; uid: string; roomId: string | null };

export function CheckInForm({
  action,
  rooms,
  cards,
  currency,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  rooms: RoomOption[];
  cards: CardOption[];
  currency: Currency;
}) {
  const [state, formAction, pending] = useActionState(action, { success: false, message: "" });
  const [roomId, setRoomId] = useState("");
  const [nights, setNights] = useState("1");
  const [amountTouched, setAmountTouched] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("PAID");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const selectedRoom = rooms.find((r) => r.id === roomId);
  const availableCards = cards.filter((c) => c.roomId === null || c.roomId === roomId);
  const needsReference = paymentMethod === "CARD" || paymentMethod === "MOBILE";
  const nightsNum = Math.max(1, Math.min(365, parseInt(nights || "1", 10) || 1));

  function onRoomChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setRoomId(id);
    const room = rooms.find((r) => r.id === id);
    if (room && !amountTouched) setAmount(String(room.price * nightsNum));
    else if (!room && !amountTouched) setAmount("");
  }

  function onNightsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setNights(v);
    if (selectedRoom && !amountTouched) {
      const n = Math.max(1, Math.min(365, parseInt(v || "1", 10) || 1));
      setAmount(String(selectedRoom.price * n));
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${state.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Guest details</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="guestName">Full name *</Label>
            <Input id="guestName" name="guestName" placeholder="Guest full name" required />
            <FieldError message={state.fieldErrors?.guestName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestPhone">Phone *</Label>
            <Input id="guestPhone" name="guestPhone" placeholder="+254 7XX XXX XXX" required />
            <FieldError message={state.fieldErrors?.guestPhone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestEmail">Email (optional)</Label>
            <Input id="guestEmail" name="guestEmail" type="email" placeholder="guest@email.com" />
            <FieldError message={state.fieldErrors?.guestEmail} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID / Passport</Label>
            <Input id="nationalId" name="nationalId" placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestPassword">Guest portal password</Label>
            <Input id="guestPassword" name="guestPassword" placeholder="Blank = auto-generated" />
            <FieldError message={state.fieldErrors?.guestPassword} />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Room, card & payment</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="roomId">Available room *</Label>
            <Select id="roomId" name="roomId" value={roomId} onChange={onRoomChange} required>
              <option value="" disabled>
                Select a room…
              </option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.number} · {currency.symbol}
                  {r.price.toLocaleString()}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.roomId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nfcCardId">NFC card *</Label>
            <Select id="nfcCardId" name="nfcCardId" required>
              <option value="" disabled>
                {roomId ? "Select a card…" : "Select a room first…"}
              </option>
              {availableCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.uid}
                  {c.roomId ? " (in use by this room)" : ""}
                </option>
              ))}
            </Select>
            <FieldError message={state.fieldErrors?.nfcCardId} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nights">Nights (duration) *</Label>
            <Input
              id="nights"
              name="nights"
              type="number"
              min={1}
              max={365}
              step="1"
              value={nights}
              onChange={onNightsChange}
              required
            />
            <p className="text-xs text-gray-500">
              Checkout:{" "}
              {new Date(Date.now() + nightsNum * 86400000).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({currency.code}) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmountTouched(true);
                setAmount(e.target.value);
              }}
              placeholder={
                selectedRoom ? String(selectedRoom.price * nightsNum) : "e.g. 4500"
              }
              required
            />
            <FieldError message={state.fieldErrors?.amount} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment method *</Label>
            <Select
              id="paymentMethod"
              name="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card / POS</option>
              <option value="MOBILE">Mobile money (M-Pesa/MoMo)</option>
              <option value="OTHER">Other</option>
            </Select>
            <FieldError message={state.fieldErrors?.paymentMethod} />
          </div>
          {needsReference ? (
            <div className="space-y-2">
              <Label htmlFor="paymentReference">
                Reference number {paymentMethod === "MOBILE" ? "(MoMo/M-Pesa code)" : "(POS slip ref)"} *
              </Label>
              <Input
                id="paymentReference"
                name="paymentReference"
                placeholder={paymentMethod === "MOBILE" ? "e.g. SGH4KL7M9P" : "e.g. POS-004512"}
                required={needsReference}
              />
              <FieldError message={state.fieldErrors?.paymentReference} />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>Payment status *</Label>
            <div className="flex gap-4 pt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="PAID"
                  checked={paymentStatus === "PAID"}
                  onChange={() => setPaymentStatus("PAID")}
                />
                Paid
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="paymentStatus"
                  value="UNPAID"
                  checked={paymentStatus === "UNPAID"}
                  onChange={() => setPaymentStatus("UNPAID")}
                />
                Unpaid
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-indigo-900">SMS to guest</p>
          <p className="text-xs text-indigo-700">
            Welcome message with room number and WiFi password will be sent on check-in.
          </p>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking in…" : "Check in guest"}
        </Button>
      </div>
    </form>
  );
}
