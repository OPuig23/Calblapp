//filename: src/app/api/modifications/route.ts
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import { getISOWeek, parseISO } from "date-fns";
import { fetchGoogleEventById } from "@/services/googleCalendar";
import admin from "firebase-admin";

/* ─────────────────────────── Helpers ─────────────────────────── */
interface ModificationDoc {
  id?: string;
  eventId?: string;
  eventCode?: string;
  eventTitle?: string;
  eventDate?: string;
  department?: string;
  createdBy?: string;
  tipus?: string;
  category?: { id?: string; label?: string };
  importance?: string;
  description?: string;
  createdAt?: FirebaseFirestore.Timestamp | string;
  [key: string]: unknown;
}

function isTimestamp(val: unknown): val is FirebaseFirestore.Timestamp {
  return typeof val === "object" && val !== null && "toDate" in val;
}

/* ─────────────────────────── Google Sheets ─────────────────────────── */
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


/* ─────────────────────────── POST ─────────────────────────── */
/**
 * Crea una nova modificació:
 * 1️⃣ Desa a Firestore
 * 2️⃣ Escriu al Google Sheets (Taula)
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let payload: Record<string, unknown>;

    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "JSON mal format" }, { status: 400 });
    }

    const {
      eventId,
      department,
      tipus,
      description,
      createdBy,
      category,
      importance,
    } = payload as {
      eventId?: string;
      department?: string;
      tipus?: string;
      description?: string;
      createdBy?: string;
      category?: { id?: string; label?: string };
      importance?: string;
    };

    if (
      !eventId ||
      !department ||
     
      !createdBy ||
      !category ||
      !importance
    ) {
      return NextResponse.json(
        { error: "Falten camps obligatoris" },
        { status: 400 }
      );
    }

    /* ───── 1️⃣ Obtenir dades de l’esdeveniment (Google Calendar) ───── */
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

    /* ───── 2️⃣ Codi d’esdeveniment ───── */
    let eventCode = "";
    const hashMatch = (ev.summary || "").match(/#([A-Z]\d{5,})/);
    if (hashMatch) {
      eventCode = hashMatch[1].trim();
    } else {
      const regexMatch = (ev.summary || "").match(/\b([CE]\d{5,})\b/);
      if (regexMatch) eventCode = regexMatch[1].trim();
    }

    /* ───── 3️⃣ Desa a Firestore ───── */
    const docRef = await firestore.collection("modifications").add({
  eventId: String(eventId),
  eventCode,
  eventTitle: evTitle,
  eventDate: evDate,
  department,
  // tipus,   ← elimina aquesta línia
  category,
  importance: importance.trim().toLowerCase(),
  description,
  createdBy,
  createdAt: admin.firestore.Timestamp.now(),
});


    /* ───── 4️⃣ Escriu a Google Sheets ───── */
    const sheets = await getSheetsClient();
    const spreadsheetId =
      process.env.MODIFICATIONS_SHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      "";
    const sheetName =
      process.env.MODIFICATIONS_SHEET_NAME ||
      process.env.INCIDENTS_SHEET_NAME ||
      "Taula";

    const rawDate = evDate;
    const weekNum = getISOWeek(parseISO(rawDate));
    const summary = (ev.summary || "").trim();

    let businessTag = "";
    if (summary.toUpperCase().startsWith("PM")) businessTag = "Prova de menú";
    else if (summary.toUpperCase().startsWith("C")) businessTag = "Casaments";
    else if (summary.toUpperCase().startsWith("E")) businessTag = "Empresa";
    else if (summary.toUpperCase().startsWith("F")) businessTag = "Foodlovers";
    else businessTag = "Altres";

    if (spreadsheetId) {
      const row: string[] = [
        eventCode, // A
        evTitle, // B
        new Date().toISOString(), // C data modificació
        evDate, // D data esdeveniment
       
        businessTag, // F línia negoci
        "", // G comercial
        department, // H departament
        createdBy, // I usuari
        category?.id || "", // J categoria codi
        category?.label || "", // K categoria nom
        description || '',     // L descripció
        importance || '',      // M importància

      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:M`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      });
    }

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err: unknown) {
    console.error("[modifications] POST error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

/* ─────────────────────────── GET ─────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const eventId = searchParams.get("eventId");
  const department = searchParams.get("department");
  const importance = searchParams.get("importance");
  const categoryId = searchParams.get("categoryId");

  try {
    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      firestore.collection("modifications").orderBy("createdAt", "desc");

    if (from)
      ref = ref.where(
        "createdAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(from))
      );
    if (to)
      ref = ref.where(
        "createdAt",
        "<=",
        admin.firestore.Timestamp.fromDate(new Date(to))
      );
    if (eventId) ref = ref.where("eventId", "==", eventId);
    if (department) ref = ref.where("department", "==", department);
    if (importance && importance !== "all")
      ref = ref.where("importance", "==", importance.toLowerCase());
    if (categoryId && categoryId !== "all")
      ref = ref.where("category.id", "==", categoryId);

    const snap = await ref.get();

    const modifications = snap.docs.map((doc) => {
      const data = doc.data() as ModificationDoc;
      let createdAtVal: string | null = null;

      if (data.createdAt) {
        if (isTimestamp(data.createdAt)) {
          createdAtVal = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === "string") {
          createdAtVal = data.createdAt;
        }
      }

      return {
        id: doc.id,
        ...data,
        createdAt: createdAtVal,
      };
    });

    return NextResponse.json({ modifications }, { status: 200 });
  } catch (err: unknown) {
    console.error("[modifications] GET error:", err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
