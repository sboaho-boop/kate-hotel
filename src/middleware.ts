import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { RoleKey } from "@/types/next-auth";
import { ROLE_HOME } from "@/lib/rbac";

const ROLE_GUARDS: { prefix: string; roles: RoleKey[] }[] = [
  { prefix: "/dashboard/super-admin", roles: ["SUPER_ADMIN"] },
  { prefix: "/dashboard/admin", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dashboard/reception", roles: ["SUPER_ADMIN", "ADMIN", "RECEPTION"] },
  { prefix: "/dashboard/cleaner", roles: ["SUPER_ADMIN", "ADMIN", "CLEANER"] },
  { prefix: "/dashboard/guest", roles: ["GUEST"] },
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = (req.nextauth.token?.role as RoleKey | undefined) ?? undefined;

    for (const guard of ROLE_GUARDS) {
      if (pathname.startsWith(guard.prefix) && !guard.roles.includes(role!)) {
        return NextResponse.redirect(new URL(ROLE_HOME[role ?? "ADMIN"], req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
