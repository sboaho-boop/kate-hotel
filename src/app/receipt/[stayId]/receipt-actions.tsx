"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import qz from "qz-tray";

const PRINTER_KEY = "receiptPrinterName";
const WIDTH_KEY = "receiptPaperMm";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out")), ms)
    ),
  ]);
}

async function connectQz() {
  if (!qz.websocket.isActive()) {
    await withTimeout(qz.websocket.connect(), 8000);
  }
}

export function ReceiptActions({
  stayId,
  autoPrint,
}: {
  stayId: string;
  autoPrint: boolean;
}) {
  const [status, setStatus] = useState("");
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState<string>("");
  const [paperMm, setPaperMm] = useState<"80" | "58">("80");
  const busy = useRef(false);

  useEffect(() => {
    const savedP = localStorage.getItem(PRINTER_KEY);
    const savedW = (localStorage.getItem(WIDTH_KEY) as "80" | "58") ?? "80";
    setPrinter(savedP ?? "");
    setPaperMm(savedW);
  }, []);

  const sendToThermal = useCallback(
    async (): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      try {
        setStatus("Connecting to printer service…");
        await connectQz();

        let target = localStorage.getItem(PRINTER_KEY) ?? "";
        if (!target) {
          target = (await qz.printers.getDefault()) as string;
        }
        if (!target) throw new Error("No default printer found");

        setStatus(`Printing to ${target}…`);
        const width = (localStorage.getItem(WIDTH_KEY) as "80" | "58") ?? "80";
        const res = await fetch(
          `/api/receipt/${stayId}?width=${width === "58" ? 32 : 48}`
        );
        if (!res.ok) throw new Error("Could not load receipt data");
        const data = (await res.json()) as { text: string };

        const escpos: number[] = [
          0x1b, 0x40, // init
        ];
        const body = Array.from(new TextEncoder().encode(data.text));
        const tail = [0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]; // feed + partial cut
        const bytes = [...escpos, ...body, ...tail];
        let bin = "";
        for (const b of bytes) bin += String.fromCharCode(b);

        const config = qz.configs.create(target);
        await qz.print(config, [
          { type: "raw", format: "command", flavor: "base64", data: btoa(bin) },
        ]);

        setStatus(`Sent to ${target} ✓`);
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`Printer service unavailable (${msg}). Using browser print…`);
        return false;
      } finally {
        try {
          if (qz.websocket.isActive()) await qz.websocket.disconnect();
        } catch {
          /* ignore */
        }
        busy.current = false;
      }
    },
    [stayId]
  );

  const loadPrinters = useCallback(async () => {
    try {
      await connectQz();
      const list = (await qz.printers.find()) as string[];
      const names = list.filter((n) => n !== "undefined");
      setPrinters(names);
      if (names.length > 0 && !localStorage.getItem(PRINTER_KEY)) {
        setPrinter(names[0]);
      }
      setStatus("Pick your thermal printer once — it will be remembered.");
    } catch {
      setStatus("Cannot reach QZ Tray. Is it running on this PC?");
    }
  }, []);

  const savePrinter = (name: string) => {
    setPrinter(name);
    localStorage.setItem(PRINTER_KEY, name);
  };

  const saveWidth = (mm: "80" | "58") => {
    setPaperMm(mm);
    localStorage.setItem(WIDTH_KEY, mm);
  };

  useEffect(() => {
    if (autoPrint && !busy.current) {
      void (async () => {
        const ok = await sendToThermal();
        if (!ok) window.print();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="no-print space-y-3 py-4">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={busy.current}
          onClick={() => void sendToThermal()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Browser print
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
        <select
          value={printer}
          onChange={(e) => savePrinter(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          <option value="">Default printer</option>
          {printers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void loadPrinters()}
          className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50"
        >
          Find printers
        </button>
        <label className="flex items-center gap-1">
          Paper:
          <select
            value={paperMm}
            onChange={(e) => saveWidth(e.target.value as "80" | "58")}
            className="rounded border border-gray-300 px-1 py-1"
          >
            <option value="80">80 mm</option>
            <option value="58">58 mm</option>
          </select>
        </label>
      </div>

      {status ? (
        <p className="text-center text-xs text-indigo-600">{status}</p>
      ) : null}
    </div>
  );
}
