import "next-auth";
import "next-auth/jwt";

export type RoleKey = "SUPER_ADMIN" | "ADMIN" | "RECEPTION" | "CLEANER" | "GUEST";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: RoleKey;
    };
  }

  interface User {
    role: RoleKey;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: RoleKey;
  }
}
