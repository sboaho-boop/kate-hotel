import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">Module placeholder</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
            <Construction className="h-6 w-6" />
          </div>
          <p className="font-medium text-gray-900">This module ships in {phase}</p>
          <p className="max-w-md text-sm text-gray-500">
            The database schema is already in place, so this module can be built without further migrations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
