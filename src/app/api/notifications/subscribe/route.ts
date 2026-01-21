// src/app/api/notifications/subscribe/route.ts
import { NextResponse } from "next/server";
import { firestoreAdmin as db } from "@/lib/firebaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.subscription || !body.userId) {
    return NextResponse.json({ error: "Dades incorrectes" }, { status: 400 });
  }

  await db
    .collection("users")
    .doc(String(body.userId))
    .collection("pushSubscriptions")
    .add({
      subscription: body.subscription,
      createdAt: Date.now(),
    });

  return NextResponse.json({ ok: true });
}
