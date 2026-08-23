export const ROOM_TYPES = ["MICRO", "STUDIO", "ONE_BEDROOM", "TWO_BEDROOM"] as const;

export const ROOM_TYPE_LABELS: Record<string, string> = {
  MICRO: "Micro",
  STUDIO: "Studio",
  ONE_BEDROOM: "One Bedroom",
  TWO_BEDROOM: "Two Bedroom",
};

export function roomTypeLabel(type: string): string {
  return ROOM_TYPE_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase();
}
