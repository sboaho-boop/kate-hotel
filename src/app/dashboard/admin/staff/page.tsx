import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/rbac";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { CreateStaffForm } from "./create-staff-form";
import { Input } from "@/components/ui/field";
import { createStaff, toggleActive, toggleOnDuty, resetPassword } from "./actions";

export const metadata: Metadata = { title: "Staff | Hotel HMS" };

const roleTone = (role: string) =>
  role === "ADMIN" ? "indigo" : role === "RECEPTION" ? "blue" : role === "CLEANER" ? "amber" : "red";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "RECEPTION", "CLEANER"] } },
    orderBy: { createdAt: "desc" },
  });

  const createStaffAction = createStaff.bind(null, actorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staff Accounts</h1>
        <p className="text-sm text-gray-500">Create staff accounts, manage duty status and access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create staff account</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateStaffForm action={createStaffAction} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff list ({staff.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email / Phone</TH>
                <TH>Role</TH>
                <TH>Duty</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <tbody>
              {staff.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium text-gray-900">{u.name}</TD>
                  <TD>
                    <p>{u.email}</p>
                    {u.phone ? <p className="text-xs text-gray-400">{u.phone}</p> : null}
                  </TD>
                  <TD>
                    <Badge tone={roleTone(u.role)}>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}</Badge>
                  </TD>
                  <TD>
                    {u.role === "RECEPTION" || u.role === "CLEANER" ? (
                      <Badge tone={u.isOnDuty ? "green" : "gray"}>{u.isOnDuty ? "On duty" : "Off duty"}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.role === "RECEPTION" || u.role === "CLEANER" ? (
                        <form action={toggleOnDuty.bind(null, actorId, u.id)}>
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          >
                            {u.isOnDuty ? "Mark off duty" : "Mark on duty"}
                          </button>
                        </form>
                      ) : null}
                      <form action={toggleActive.bind(null, actorId, u.id)}>
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                        >
                          {u.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                      <details className="relative inline-block">
                        <summary className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
                          Reset pw
                        </summary>
                        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                          <form action={resetPassword.bind(null, actorId, u.id)} className="space-y-2">
                            <Input name="password" type="password" placeholder="New password" required minLength={6} />
                            <button
                              type="submit"
                              className="w-full rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700"
                            >
                              Save password
                            </button>
                          </form>
                        </div>
                      </details>
                    </div>
                  </TD>
                </TR>
              ))}
              {staff.length === 0 ? (
                <TR>
                  <TD colSpan={6} className="py-8 text-center text-gray-400">
                    No staff accounts yet.
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
