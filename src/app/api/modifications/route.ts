// filename: src/app/api/modifications/route.ts
import { NextResponse } from "next/server"
import { firestoreAdmin } from "@/lib/firebaseAdmin"
import { google } from "googleapis"
import { getISOWeek, parseISO } from "date-fns"
import admin from "firebase-admin"

interface ModificationDoc {
  id?: string
  eventId?: string
  eventCode?: string
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  eventCommercial?: string
  modificationNumber?: string
  department?: string
  createdBy?: string
  category?: { id?: string; label?: string }
  importance?: string
  description?: string
  createdAt?: FirebaseFirestore.Timestamp | string
  updatedAt?: FirebaseFirestore.Timestamp | string
  [key: string]: unknown
}

function isTimestamp(val: unknown): val is FirebaseFirestore.Timestamp {
  return typeof val === "object" && val !== null && "toDate" in val
}

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

async function generateModificationNumber(): Promise<string> {
  const counterRef = firestoreAdmin.collection("counters").doc("modifications")

  const next = await firestoreAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const current = (snap.data()?.value as number) || 0
    const updated = current + 1
    tx.set(counterRef, { value: updated }, { merge: true })
    return updated
  })

  return `MOD${String(next).padStart(6, "0")}`
}

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
      eventCommercial,
      department,
      createdBy,
      category,
      importance,
      description,
    } = payload as ModificationDoc

    const modificationNumber = await generateModificationNumber()

    // Llegir event de stage_verd (si existeix) per omplir camps d'esdeveniment
    let ev: any = null
    if (eventId) {
      const evSnap = await firestoreAdmin.collection("stage_verd").doc(String(eventId)).get()
      if (evSnap.exists) ev = evSnap.data()
    }

    const eventTitleFinal = eventTitle || ev?.NomEvent || ""
    const eventLocationFinal = eventLocation || ev?.Ubicacio || ""
    const eventCodeFinal = eventCode || ev?.code || ev?.Code || ev?.C_digo || ev?.codi || ""
    const eventDateFinal = eventDate || ev?.DataInici || ev?.DataPeticio || ""
    const eventCommercialFinal = eventCommercial || ev?.Comercial || ""

    const docRef = await firestoreAdmin.collection("modifications").add({
      modificationNumber,
      eventId: eventId || "",
      eventCode: eventCodeFinal,
      eventTitle: eventTitleFinal,
      eventDate: eventDateFinal,
      eventLocation: eventLocationFinal,
      eventCommercial: eventCommercialFinal,
      department: department || "",
      category: category || { id: "", label: "" },
      importance: importance?.trim().toLowerCase() || "",
      description: description || "",
      createdBy: createdBy || "",
      createdAt: admin.firestore.Timestamp.now(),
    })

    // Escriu a Google Sheets (best-effort)
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
      ? "Prova de mençà"
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
        modificationNumber,
        weekNum.toString(),
      ]

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:N`,
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const eventId = searchParams.get("eventId")
  const department = searchParams.get("department")
  const importance = searchParams.get("importance")
  const commercial = searchParams.get("commercial")
  const categoryLabel = searchParams.get("categoryLabel")
  const categoryId = searchParams.get("categoryId") // compatibilitat antiga

  try {
    let ref: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      firestoreAdmin.collection("modifications").orderBy("createdAt", "desc")

    if (from) {
      const fromDate = new Date(`${from}T00:00:00.000Z`)
      ref = ref.where("createdAt", ">=", admin.firestore.Timestamp.fromDate(fromDate))
    }

    if (to) {
      const toDate = new Date(`${to}T23:59:59.999Z`)
      ref = ref.where("createdAt", "<=", admin.firestore.Timestamp.fromDate(toDate))
    }
    if (eventId) ref = ref.where("eventId", "==", eventId)
    if (department && department !== "all")
      ref = ref.where("department", "==", department)
    if (importance && importance !== "all")
      ref = ref.where("importance", "==", importance.toLowerCase())
    if (commercial && commercial !== "all")
      ref = ref.where("eventCommercial", "==", commercial)

    const categoryFilter =
      categoryLabel && categoryLabel !== "all"
        ? categoryLabel
        : categoryId && categoryId !== "all"
        ? categoryId
        : null

    if (categoryFilter) {
      ref = ref.where("category.label", "==", categoryFilter)
    }

    const snap = await ref.get()
    const baseMods = snap.docs.map((doc) => {
      const data = doc.data() as ModificationDoc
      let createdAtVal: string | null = null
      let updatedAtVal: string | null = null

      if (data.createdAt) {
        if (isTimestamp(data.createdAt))
          createdAtVal = data.createdAt.toDate().toISOString()
        else if (typeof data.createdAt === "string") createdAtVal = data.createdAt
      }

      if (data.updatedAt) {
        if (isTimestamp(data.updatedAt))
          updatedAtVal = data.updatedAt.toDate().toISOString()
        else if (typeof data.updatedAt === "string") updatedAtVal = data.updatedAt
      }

      return { id: doc.id, ...data, createdAt: createdAtVal, updatedAt: updatedAtVal }
    })

    // Enriquim amb dades d'esdeveniment (nom/ubicació/data/codi) si falten
    const eventIds = Array.from(new Set(baseMods.map((m) => m.eventId).filter(Boolean))) as string[]
    const eventsSnap = eventIds.length
      ? await firestoreAdmin
          .collection("stage_verd")
          .where(admin.firestore.FieldPath.documentId(), "in", eventIds)
          .get()
      : null

    const eventsMap = new Map<string, any>()
    eventsSnap?.docs.forEach((doc) => eventsMap.set(doc.id, doc.data()))

    const modifications = baseMods.map((m) => {
      const ev = eventsMap.get(m.eventId || "")
      if (!ev) return m
      return {
        ...m,
        eventTitle: m.eventTitle || ev.NomEvent || "",
        eventLocation: m.eventLocation || ev.Ubicacio || "",
        eventCode: m.eventCode || ev.code || ev.Code || ev.C_digo || ev.codi || "",
        eventDate: m.eventDate || ev.DataInici || ev.DataPeticio || "",
        eventCommercial: m.eventCommercial || ev.Comercial || "",
      }
    })

    return NextResponse.json({ modifications }, { status: 200 })
  } catch (err: unknown) {
    console.error("[modifications] GET error:", err)
    if (err instanceof Error)
      return NextResponse.json({ error: err.message }, { status: 500 })
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
