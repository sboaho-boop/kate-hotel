import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { DutyGate } from "@/components/duty-gate";
import { ROLE_HOME } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isOnDuty: true },
  });

  return (
    <AppShell
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      <DutyGate role={session.user.role} home={ROLE_HOME[session.user.role]} onDuty={user?.isOnDuty ?? false}>
        {children}
      </DutyGate>
    </AppShell>
  );
}
