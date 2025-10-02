// src/app/api/events/[id]/route.ts
import { NextResponse } from "next/server";
import { fetchGoogleEventById } from "@/services/googleCalendar";

// 🔹 Tipado mínimo del evento de Google Calendar que nos interesa
interface GoogleCalendarAttachment {
  fileUrl: string
  title?: string
  mimeType?: string
}
export interface GoogleCalendarEvent {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attachments?: GoogleCalendarAttachment[]
  [key: string]: unknown // permitimos campos extra de Google
}

export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  try {
    const ev = (await fetchGoogleEventById(id)) as unknown as GoogleCalendarEvent | null;
    if (!ev) {
      return NextResponse.json({ error: "No trobat" }, { status: 404 });
    }
    return NextResponse.json(ev, { status: 200 });
  } catch (err: unknown) {
    console.error("[app/api/events/[id]] error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
