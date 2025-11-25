// File: src/app/api/incidents/route.ts
import { NextResponse } from "next/server";
import { firestoreAdmin } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

interface IncidentDoc {
  id?: string;
  eventId?: string;
  eventCode?: string;
  department?: string;
  importance?: string;
  description?: string;
  createdBy?: string;
  status?: string;
  createdAt?: FirebaseFirestore.Timestamp | string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  category?: { id?: string; label?: string };
  [key: string]: unknown;
}

/* -------------------------------------------------------
 * 🔵 HELPER: format timestamp
 * ----------------------------------------------------- */
function normalizeTimestamp(ts: any): string {
  if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (typeof ts === "string") return ts;
  return "";
}

/* -------------------------------------------------------
 * 🔵 HELPER: Generar número INCxxxxx
 * ----------------------------------------------------- */
async function generateIncidentNumber(): Promise<string> {
  const counterRef = firestoreAdmin.collection("counters").doc("incidents");

  const next = await firestoreAdmin.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = (snap.data()?.value as number) || 0;
    const updated = current + 1;
    tx.set(counterRef, { value: updated }, { merge: true });
    return updated;
  });

  return `INC${String(next).padStart(6, "0")}`;
}

/* -------------------------------------------------------
 * 🔵 POST — Crear incidència
 * ----------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    let payload: Record<string, any>;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "JSON mal formatejat" }, { status: 400 });
    }

    const { eventId, department, importance, description, respSala, category } =
      payload;

    if (!eventId || !department || !importance || !description || !respSala || !category) {
      return NextResponse.json(
        { error: "Falten camps obligatoris" },
        { status: 400 }
      );
    }

    // 1️⃣ Llegir esdeveniment
    const evSnap = await firestoreAdmin.collection("stage_verd").doc(String(eventId)).get();

    if (!evSnap.exists) {
      return NextResponse.json(
        { error: "No s’ha trobat l’esdeveniment a stage_verd" },
        { status: 404 }
      );
    }

    const ev = evSnap.data() as any;

    // 2️⃣ Generar número d’incidència
    const incidentNumber = await generateIncidentNumber();

    // 3️⃣ Crear document incidència
    const docRef = await firestoreAdmin.collection("incidents").add({
      incidentNumber,
      eventId: String(eventId),
      eventCode:
        ev.code || ev.Code || ev.C_digo || ev.codi || "",
      department,
      importance: importance.trim().toLowerCase(),
      description,
      createdBy: respSala,
      status: "obert",
      createdAt: admin.firestore.Timestamp.now(),

      // dades event
      eventTitle: ev.NomEvent || "",
      eventDate: ev.DataInici || ev.DataPeticio || "",
      eventLocation: ev.Ubicacio || "",
      category: {
        id: category?.id || "",
        label: category?.label || "",
      },
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err: any) {
    console.error("[incidents] POST error:", err);
    return NextResponse.json({ error: err.message || "Error intern" }, { status: 500 });
  }
}

/* -------------------------------------------------------
 * 🔵 GET — Llistar incidències
 * ----------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const importance = searchParams.get("importance");
    const eventId = searchParams.get("eventId");
    const categoryId = searchParams.get("categoryId");

    let ref = firestoreAdmin
      .collection("incidents")
      .orderBy("createdAt", "desc");

  if (from && to) {
  ref = ref
    .where("eventDate", ">=", from)
    .where("eventDate", "<=", to);
}


    if (eventId) ref = ref.where("eventId", "==", eventId);
    if (importance && importance !== "all")
      ref = ref.where("importance", "==", importance);
    if (categoryId && categoryId !== "all")
      ref = ref.where("category.label", "==", categoryId);

    // 1️⃣ Llegir incidències crues
    const snap = await ref.get();

    const raw = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        createdAt: normalizeTimestamp(d.createdAt),
      };
    }) as IncidentDoc[];

    // 2️⃣ Recuperar esdeveniments stage_verd
    const eventIds = [...new Set(raw.map((i) => i.eventId))];

    const eventsSnap = eventIds.length
      ? await firestoreAdmin
          .collection("stage_verd")
          .where(admin.firestore.FieldPath.documentId(), "in", eventIds)
          .get()
      : null;

    const eventsMap = new Map();
    eventsSnap?.docs.forEach((doc) => eventsMap.set(doc.id, doc.data()));

    // 3️⃣ Enriquir incidències
    const incidents = raw.map((inc) => {
      const ev = eventsMap.get(inc.eventId || "") || {};

      return {
        ...inc,
        ln: ev.LN || "",
        serviceType: ev.Servei || "",
        pax: ev.NumPax || "",
        eventCode:
          ev.code || ev.Code || ev.C_digo || ev.codi || "",
        eventTitle: ev.NomEvent || "",
        eventLocation: ev.Ubicacio || "",
        fincaId: ev.FincaId || ev.FincaCode || "",
      };
    });

    return NextResponse.json({ incidents }, { status: 200 });
  } catch (err) {
    console.error("[incidents] GET error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
