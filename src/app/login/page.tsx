import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Hotel } from "lucide-react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in | Hotel HMS" };

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500">
            <Hotel className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Hotel HMS</h1>
            <p className="text-sm text-slate-400">Staff &amp; Guest Operations</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">Welcome back</h2>
          <p className="mb-5 text-sm text-gray-500">Sign in to your account</p>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Seeded logins: superadmin@hotel.test / admin@hotel.test (see .env)
        </p>
      </div>
    </div>
  );
}
