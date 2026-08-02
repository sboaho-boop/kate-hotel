import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "My Stay | Hotel HMS" };

export default function GuestDashboardPage() {
  return <ComingSoon title="My Stay" phase="Phase 2" />;
}
