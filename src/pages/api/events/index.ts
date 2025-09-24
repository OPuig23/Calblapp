// src/pages/api/events/index.ts
import type { NextApiRequest, NextApiResponse } from "next";

const CALENDAR_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID;
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { from, to } = req.query;
  console.log('[PAGES /api/events] HIT');

  if (!from || !to) return res.status(400).json({ error: "Falten paràmetres de dates" });

  const timeMin = new Date(from as string).toISOString();
  const timeMax = new Date(to as string).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  try {
    const resp = await fetch(url);
    const data = await resp.json();

    // Imprimeix la resposta per veure exactament què arriba
    console.log("GOOGLE CALENDAR RAW:", JSON.stringify(data.items, null, 2));

    // Sense filtre extra: mostra TOTS els esdeveniments
    const events = (data.items || []).map((ev: any) => ({
      id: ev.id,
      title: ev.summary,
      date: ev.start?.date || ev.start?.dateTime?.slice(0, 10),
      location: ev.location || "",
      state: "pending", // O el que correspongui
      code: ev.summary?.match(/#(\d+)/)?.[1] || "",
    }));

    return res.status(200).json({ events });
  } catch (err: any) {
    return res.status(500).json({ error: "Error consultat Google Calendar", details: err.message });
  }
}
