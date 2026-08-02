import type { RoleKey } from "@/types/next-auth";

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  RECEPTION: "Receptionist",
  CLEANER: "Cleaner",
  GUEST: "Guest",
};

export const STAFF_ROLES: RoleKey[] = ["SUPER_ADMIN", "ADMIN", "RECEPTION", "CLEANER"];

export function requireRole(role: RoleKey | undefined, allowed: RoleKey[]): boolean {
  return !!role && allowed.includes(role);
}

export const ROLE_HOME: Record<RoleKey, string> = {
  SUPER_ADMIN: "/dashboard/super-admin",
  ADMIN: "/dashboard/admin",
  RECEPTION: "/dashboard/reception",
  CLEANER: "/dashboard/cleaner",
  GUEST: "/dashboard/guest",
};

export function homeForRole(role: RoleKey | undefined): string {
  if (!role) return "/login";
  return ROLE_HOME[role];
}
