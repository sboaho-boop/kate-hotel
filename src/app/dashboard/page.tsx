import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { homeForRole } from "@/lib/rbac";

export default async function DashboardIndex() {
  const session = await getServerSession(authOptions);
  redirect(homeForRole(session?.user.role));
}
