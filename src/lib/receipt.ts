export type ReceiptPayment = {
  method: string;
  methodLabel: string;
  amount: number;
  status: string;
  reference?: string | null;
};

export type ReceiptData = {
  hotelName: string;
  wifiSsid: string;
  wifiPassword: string;
  receiptNo: string;
  issuedAt: string;
  stayStatus: string;
  guestName: string;
  guestPhone?: string | null;
  guestNationalId?: string | null;
  roomNumber: string;
  roomType: string;
  roomRate: number;
  checkInAt: string;
  checkoutAt: string;
  durationLabel: string;
  nfcCardUid?: string | null;
  payments: ReceiptPayment[];
  paidTotal: number;
  dueTotal: number;
  currencySymbol: string;
};

const money = (n: number, d: ReceiptData) =>
  `${d.currencySymbol}${n.toLocaleString("en-US")}`;

function row(left: string, right: string, width: number): string {
  const space = width - left.length - right.length;
  if (space < 1) return `${left} ${right}`.slice(0, width);
  return left + " ".repeat(space) + right;
}

function center(text: string, width: number): string {
  const t = text.slice(0, width);
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return " ".repeat(pad) + t;
}

function divider(width: number): string {
  return "-".repeat(width);
}

/**
 * Builds the plain-text receipt body (48 chars for 80mm paper, 32 for 58mm).
 * ESC/POS commands (init/align/bold/cut) are applied by the client.
 */
export function buildReceiptText(d: ReceiptData, width: number): string {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s.slice(0, width));

  push(center(d.hotelName.toUpperCase(), width));
  push(center("*** GUEST RECEIPT ***", width));
  push(divider(width));
  push(row(`No: ${d.receiptNo}`, d.stayStatus.replace("_", "-"), width));
  push(row("Issued:", d.issuedAt, width));
  push(divider(width));
  push("GUEST");
  push(`Name: ${d.guestName}`);
  if (d.guestPhone) push(`Phone: ${d.guestPhone}`);
  if (d.guestNationalId) push(`ID No: ${d.guestNationalId}`);
  push(divider(width));
  push("STAY");
  push(`Room: ${d.roomNumber} (${d.roomType})`);
  push(`Rate: ${money(d.roomRate, d)} / night`);
  push(`In: ${d.checkInAt}`);
  push(`Checkout: ${d.checkoutAt}`);
  push(`Duration: ${d.durationLabel}`);
  if (d.nfcCardUid) push(`Key card: ${d.nfcCardUid}`);
  push(divider(width));
  push("PAYMENTS");
  if (d.payments.length === 0) {
    push("None recorded");
  } else {
    push(row("Method", "Amt      Status", width));
    for (const p of d.payments) {
      push(
        row(
          p.methodLabel,
          `${money(p.amount, d)} ${p.status}`.padStart(1),
          width
        )
      );
      if (p.reference) push(`  Ref: ${p.reference}`);
    }
  }
  push(divider(width));
  push(row("TOTAL PAID:", money(d.paidTotal, d), width));
  if (d.dueTotal > 0) {
    push(row("BALANCE DUE:", money(d.dueTotal, d), width));
  }
  push(divider(width));
  push();
  push(center("FREE WIFI", width));
  push(center(`${d.wifiSsid} / ${d.wifiPassword}`, width));
  push();
  push(center("Thank you for staying with us!", width));
  push();

  return lines.join("\n");
}
