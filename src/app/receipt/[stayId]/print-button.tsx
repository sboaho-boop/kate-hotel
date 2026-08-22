"use client";

import { useEffect } from "react";

export function PrintButton({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="toolbar no-print flex items-center justify-center gap-3 py-4">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Print receipt
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Close
      </button>
    </div>
  );
}
