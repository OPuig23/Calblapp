// File: src/app/api/events/[id]/route.ts

import { NextResponse } from "next/server";
import { fetchGoogleEventById } from "@/services/googleCalendar";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const ev = await fetchGoogleEventById(id);
    if (!ev) {
      return NextResponse.json({ error: "No trobat" }, { status: 404 });
    }
    return NextResponse.json(ev, { status: 200 });
  } catch (err: any) {
    console.error("[app/api/events/[id]] error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
