// src/app/api/incidents/route.ts
import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { getISOWeek, parseISO } from "date-fns";
import { fetchGoogleEventById } from "@/services/googleCalendar";
import admin from "firebase-admin";

interface IncidentDoc {
  id?: string
  eventId?: string
  eventCode?: string
  department?: string
  importance?: string
  description?: string
  createdBy?: string
  status?: string
  createdAt?: FirebaseFirestore.Timestamp | string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  category?: { id?: string; label?: string }
  [key: string]: unknown
}

function isTimestamp(val: unknown): val is FirebaseFirestore.Timestamp {
  return typeof val === "object" && val !== null && "toDate" in val
}

/** Google Sheets client */
async function getSheetsClient() {
  const credentialsJSON = process.env.GOOGLE_SHEETS_CREDENTIALS
  if (!credentialsJSON) throw new Error('GOOGLE_SHEETS_CREDENTIALS no definit')

  const credentials = JSON.parse(credentialsJSON)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}


/** POST: crear incidència + enviar a Google Sheets */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "JSON mal formatejat" },
        { status: 400 }
      );
    }

    const {
      eventId,
      department,
      importance,
      description,
      respSala,
      category,
    } = payload as {
      eventId?: string
      department?: string
      importance?: string
      description?: string
      respSala?: string
      category?: { id?: string; label?: string }
    };

    if (
      !eventId ||
      !department ||
      !importance ||
      !description ||
      !respSala ||
      !category
    ) {
      return NextResponse.json(
        { error: "Falten camps obligatoris" },
        { status: 400 }
      );
    }

    // 1) Dades de l’esdeveniment (Google Calendar)
    const ev = await fetchGoogleEventById(eventId);
    if (!ev) {
      return NextResponse.json(
        { error: "No s’ha trobat l’esdeveniment a Google Calendar" },
        { status: 404 }
      );
    }

    const evTitle = ev.summary || "";
    const evDate = ev.start?.dateTime || ev.start?.date || "";
    const evLocation = ev.location || "";

    // 2) Codi d’esdeveniment robust
    let eventCode = "";
    const hashMatch = (ev.summary || "").match(/#([A-Z]\d{5,})/);
    if (hashMatch) {
      eventCode = hashMatch[1].trim();
    } else {
      const regexMatch = (ev.summary || "").match(/\b([CE]\d{5,})\b/);
      if (regexMatch) eventCode = regexMatch[1].trim();
    }

    // 3) Desa a Firestore
    const docRef = await firestoreAdmin.collection("incidents").add({
      eventId: String(eventId),
      eventCode,
      department,
      importance: importance.trim().toLowerCase(),
      description,
      createdBy: respSala,
      status: "obert",
      createdAt: admin.firestore.Timestamp.now(),
      eventTitle: evTitle,
      eventDate: evDate,
      eventLocation: evLocation,
      category: {
        id: category?.id || "",
        label: category?.label || "",
      },
    });

    // 4) Escriu a Google Sheets
    const rawDate = evDate;
    const weekNum = getISOWeek(parseISO(rawDate));
    const paxMatch = /(\d+)\s*pax/i.exec(ev.summary || "");
    const pax = paxMatch ? Number(paxMatch[1]) : 0;

    const summary = (ev.summary || "").trim();
    let businessTag = "";
    if (summary.toUpperCase().startsWith("PM")) {
      businessTag = "Prova de menu";
    } else {
      const firstChar = summary.charAt(0).toUpperCase();
      if (firstChar === "C") businessTag = "Casaments";
      if (firstChar === "E") businessTag = "Empresa";
      if (firstChar === "A") businessTag = "Agenda";
      if (firstChar === "F") businessTag = "Fires i Festivals";
    }

    const sheets = await getSheetsClient();
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.SHEETS_SPREADSHEET_ID ||
      process.env.INCIDENTS_SHEET_ID ||
      "";
    const sheetName = process.env.INCIDENTS_SHEET_NAME || "Taula";

    if (spreadsheetId) {
      const row: string[] = [
        eventCode,
        rawDate,
        String(weekNum),
        businessTag,
        evLocation,
        String(pax),
        "", "", "",
        respSala,
        "", "",
        description,
        department,
        importance,
        category?.id || "",
        category?.label || "",
      ];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Q`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    }

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err: unknown) {
    console.error("[incidents] POST error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const importance = searchParams.get("importance");
  const eventId = searchParams.get("eventId");
  const categoryId = searchParams.get("categoryId");

  try {
    console.log("[incidents] GET query", { from, to, importance, eventId, categoryId });

    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      firestoreAdmin.collection("incidents").orderBy("createdAt", "desc");

    if (from && to) {
      ref = ref
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(new Date(from)))
        .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(new Date(to)));
    } else if (from) {
      ref = ref.where(
        "createdAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(from))
      );
    } else if (to) {
      ref = ref.where(
        "createdAt",
        "<=",
        admin.firestore.Timestamp.fromDate(new Date(to))
      );
    }

    if (eventId) {
      ref = ref.where("eventId", "==", eventId);
    }

    if (categoryId && categoryId !== "all") {
      ref = ref.where("category.label", "==", categoryId);
    }

    if (importance && importance !== "all") {
      ref = ref.where("importance", "==", importance);
    }

    const snap = await ref.get();
    console.log("[incidents] Docs fetched:", snap.size);

    const incidents = snap.docs.map((doc) => {
      const data = doc.data() as unknown as IncidentDoc
      let createdAtVal: string | null = null

      if (data.createdAt) {
        if (isTimestamp(data.createdAt)) {
          createdAtVal = data.createdAt.toDate().toISOString()
        } else if (typeof data.createdAt === "string") {
          createdAtVal = data.createdAt
        }
      }

      return {
        id: doc.id,
        ...data,
        createdAt: createdAtVal,
      }
    });

    console.log("[incidents] GET result", { count: incidents.length });
    return NextResponse.json({ incidents }, { status: 200 });
  } catch (err: unknown) {
    console.error("[incidents] GET error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
