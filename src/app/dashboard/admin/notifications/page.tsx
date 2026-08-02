import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllRead } from "@/app/dashboard/actions";

export const metadata: Metadata = { title: "Notifications | Hotel HMS" };

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">
            {unreadCount} unread · live check-in alerts and shift report notifications.
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllRead.bind(null, userId)}>
            <Button type="submit" variant="subtle" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent notifications</CardTitle>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <li key={n.id} className={`flex items-start gap-3 px-5 py-4 ${n.readAt ? "" : "bg-indigo-50/40"}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {!n.readAt ? <Badge tone="indigo">New</Badge> : null}
                  </div>
                  {n.body ? <p className="mt-0.5 text-sm text-gray-500">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-gray-400">{n.createdAt.toLocaleString()}</p>
                </div>
              </li>
            ))}
            {notifications.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">No notifications yet.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
