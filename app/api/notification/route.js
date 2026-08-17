import { NextResponse } from "next/server";
import { notifications as mockNotifications } from "@/data/notifications";

export async function GET() {
  const items = mockNotifications.map(n => ({ ...n, created_at: n.time }));
  const unreadCount = items.filter(n => !n.read).length;
  return NextResponse.json({ notifications: items, unreadCount });
}

export async function POST() {
  return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
}
