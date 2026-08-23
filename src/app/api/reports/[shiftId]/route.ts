import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { renderShiftPdf } from "@/lib/shift-report";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ shiftId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shiftId } = await ctx.params;
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!shift || !shift.endedAt) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isOwner = shift.userId === session.user.id;
  const isManagement = requireRole(session.user.role, ["ADMIN", "SUPER_ADMIN"]);
  if (!isOwner && !isManagement) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buffer = await renderShiftPdf(shift);
  const download = req.nextUrl.searchParams.get("dl") === "1";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="shift-report-${shift.id.slice(-8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
