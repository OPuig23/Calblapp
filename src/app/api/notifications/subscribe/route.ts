// src/app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { firestoreAdmin as db } from "@/lib/firebaseAdmin";
import webpush from "web-push";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.subscription || !body.userId) {
    return NextResponse.json({ error: "Dades incorrectes" }, { status: 400 });
  }

  await db
    .collection("pushSubscriptions")
    .doc(body.userId)
    .set(body.subscription, { merge: true });

  return NextResponse.json({ ok: true });
}
