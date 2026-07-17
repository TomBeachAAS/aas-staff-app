'use client';

import { Printer } from 'lucide-react';

export function ExportPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-1.5 bg-aas-blue text-white rounded-lg text-sm font-medium hover:bg-aas-blue-dark transition-colors"
    >
      <Printer size={15} />
      Print / Save PDF
    </button>
  );
}
