import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { FileText, Download, Printer } from "lucide-react";

export const metadata: Metadata = { title: "Shift Reports | Hotel HMS" };

export default async function ReportsPage() {
  const reports = await prisma.shiftReport.findMany({
    orderBy: { generatedAt: "desc" },
    include: { shift: { include: { user: { select: { name: true } } } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shift Reports</h1>
        <p className="text-sm text-gray-500">Automatically generated PDF reports at the end of each reception shift.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Report</TH>
                <TH>Staff</TH>
                <TH>Shift</TH>
                <TH>Generated</TH>
                <TH>Status</TH>
                <TH className="text-right">Download</TH>
              </TR>
            </THead>
            <tbody>
              {reports.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      Report #{r.id.slice(0, 8)}
                    </div>
                  </TD>
                  <TD>{r.shift.user.name}</TD>
                  <TD className="text-xs text-gray-500">
                    {r.shift.startedAt.toLocaleString()} → {r.shift.endedAt?.toLocaleString() ?? "—"}
                  </TD>
                  <TD className="text-xs text-gray-500">{r.generatedAt.toLocaleString()}</TD>
                  <TD>
                    <Badge tone="green">Ready</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/reports/${r.shiftId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </a>
                      <a
                        href={`/api/reports/${r.shiftId}?dl=1`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                    </div>
                  </TD>
                </TR>
              ))}
              {reports.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-gray-400">
                    No shift reports yet. Reports are generated when a receptionist ends their shift.
                  </TD>
                </TR>
              ) : null}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
