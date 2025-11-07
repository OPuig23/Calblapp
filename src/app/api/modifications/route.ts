// filename: src/app/api/modifications/route.ts
import { NextResponse } from "next/server"
import { firestoreAdmin  } from "@/lib/firebaseAdmin"
import { google } from "googleapis"
import { getISOWeek, parseISO } from "date-fns"
import admin from "firebase-admin"

/* ─────────────────────────── Helpers ─────────────────────────── */
interface ModificationDoc {
  id?: string
  eventId?: string
  eventCode?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  department?: string
  createdBy?: string
  category?: { id?: string; label?: string }
  importance?: string
  description?: string
  createdAt?: FirebaseFirestore.Timestamp | string
  [key: string]: unknown
}

function isTimestamp(val: unknown): val is FirebaseFirestore.Timestamp {
  return typeof val === "object" && val !== null && "toDate" in val
}

/* ─────────────────────────── Google Sheets ─────────────────────────── */
async function getSheetsClient() {
  const credentialsJSON = process.env.GOOGLE_SHEETS_CREDENTIALS
  if (!credentialsJSON) throw new Error("GOOGLE_SHEETS_CREDENTIALS no definit")

  const credentials = JSON.parse(credentialsJSON)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

/* ─────────────────────────── POST ─────────────────────────── */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    let payload: Record<string, unknown>

    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: "JSON mal format" }, { status: 400 })
    }

    const {
      eventId,
      eventCode,
      eventTitle,
      eventDate,
      eventLocation,
      department,
      createdBy,
      category,
      importance,
      description,
    } = payload as ModificationDoc

    // Desa sempre, encara que hi falti informació
    const docRef = await firestoreAdmin.collection("modifications").add({
      eventId: eventId || "",
      eventCode: eventCode || "",
      eventTitle: eventTitle || "",
      eventDate: eventDate || "",
      eventLocation: eventLocation || "",
      department: department || "",
      category: category || { id: "", label: "" },
      importance: importance?.trim().toLowerCase() || "",
      description: description || "",
      createdBy: createdBy || "",
      createdAt: admin.firestore.Timestamp.now(),
    })

    /* ───── Escriu a Google Sheets ───── */
    const sheets = await getSheetsClient()
    const spreadsheetId =
      process.env.MODIFICATIONS_SHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      ""
    const sheetName =
      process.env.MODIFICATIONS_SHEET_NAME ||
      process.env.INCIDENTS_SHEET_NAME ||
      "Taula"

    const weekNum = eventDate ? getISOWeek(parseISO(eventDate)) : ""
    const businessTag = eventCode?.toUpperCase().startsWith("C")
      ? "Casaments"
      : eventCode?.toUpperCase().startsWith("E")
      ? "Empresa"
      : eventCode?.toUpperCase().startsWith("F")
      ? "Foodlovers"
      : eventCode?.toUpperCase().startsWith("PM")
      ? "Prova de menú"
      : "Altres"

    if (spreadsheetId) {
      const row: string[] = [
        eventCode || "",
        eventTitle || "",
        new Date().toISOString(), // data de modificació
        eventDate || "",
        businessTag,
        eventLocation || "",
        department || "",
        createdBy || "",
        category?.id || "",
        category?.label || "",
        description || "",
        importance || "",
      ]

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:L`,
        valueInputOption: "RAW",
        requestBody: { values: [row] },
      })
    }

    return NextResponse.json({ id: docRef.id }, { status: 201 })
  } catch (err: unknown) {
    console.error("[modifications] POST error:", err)
    if (err instanceof Error)
      return NextResponse.json({ error: err.message }, { status: 500 })
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

/* ─────────────────────────── GET ─────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const eventId = searchParams.get("eventId")
  const department = searchParams.get("department")
  const importance = searchParams.get("importance")
  const categoryId = searchParams.get("categoryId")

  try {
    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      firestoreAdmin.collection("modifications").orderBy("createdAt", "desc")

    if (from)
      ref = ref.where(
        "createdAt",
        ">=",
        admin.firestore.Timestamp.fromDate(new Date(from))
      )
    if (to)
      ref = ref.where(
        "createdAt",
        "<=",
        admin.firestore.Timestamp.fromDate(new Date(to))
      )
    if (eventId) ref = ref.where("eventId", "==", eventId)
    if (department) ref = ref.where("department", "==", department)
    if (importance && importance !== "all")
      ref = ref.where("importance", "==", importance.toLowerCase())
    if (categoryId && categoryId !== "all")
      ref = ref.where("category.id", "==", categoryId)

    const snap = await ref.get()
    const modifications = snap.docs.map((doc) => {
      const data = doc.data() as ModificationDoc
      let createdAtVal: string | null = null

      if (data.createdAt) {
        if (isTimestamp(data.createdAt))
          createdAtVal = data.createdAt.toDate().toISOString()
        else if (typeof data.createdAt === "string") createdAtVal = data.createdAt
      }

      return { id: doc.id, ...data, createdAt: createdAtVal }
    })

    return NextResponse.json({ modifications }, { status: 200 })
  } catch (err: unknown) {
    console.error("[modifications] GET error:", err)
    if (err instanceof Error)
      return NextResponse.json({ error: err.message }, { status: 500 })
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
