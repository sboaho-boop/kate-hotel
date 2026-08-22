import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/rbac";
import { getHotelSettings } from "@/lib/hotel-settings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { saveSettings } from "./actions";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings | Hotel HMS" };

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!requireRole(session.user.role, ["SUPER_ADMIN", "ADMIN"])) {
    redirect("/dashboard");
  }

  const settings = await getHotelSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System settings</h1>
        <p className="text-sm text-gray-500">
          Hotel name and currency used across the whole system.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            action={saveSettings.bind(null, session.user.id)}
            hotelName={settings.name}
            currency={settings.currency}
          />
        </CardContent>
      </Card>
    </div>
  );
}
