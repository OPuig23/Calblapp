import { NextRequest, NextResponse } from "next/server"
import { firestore } from "@/lib/firebaseAdmin"

// 🔹 GET → llistar esdeveniments
export async function GET() {
  try {
    const snapshot = await firestore.collection("esdeveniments").get()
    const events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return NextResponse.json({ success: true, data: events })
  } catch (err) {
    console.error("🔥 Error carregant esdeveniments:", err)
    return NextResponse.json(
      { success: false, error: "Error carregant esdeveniments" },
      { status: 500 }
    )
  }
}

// 🔹 POST → crear esdeveniment nou
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ref = await firestore.collection("esdeveniments").add({
      ...body,
      createdAt: Date.now(),
      createdBy: "unknown",
    })
    return NextResponse.json({ success: true, id: ref.id })
  } catch (err) {
    console.error("🔥 Error creant esdeveniment:", err)
    return NextResponse.json(
      { success: false, error: "Error creant esdeveniment" },
      { status: 500 }
    )
  }
}

// 🔹 PUT → actualitzar un esdeveniment
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta l'ID de l'esdeveniment" },
        { status: 400 }
      )
    }

    const body = await req.json()

    await firestore.collection("esdeveniments").doc(id).set(
      {
        ...body,
        updatedAt: Date.now(),
      },
      { merge: true }
    )

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error("🔥 Error actualitzant esdeveniment:", err)
    return NextResponse.json(
      { success: false, error: "Error actualitzant esdeveniment" },
      { status: 500 }
    )
  }
}

// 🔹 DELETE → eliminar esdeveniment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Falta l'ID de l'esdeveniment" },
        { status: 400 }
      )
    }

    await firestore.collection("esdeveniments").doc(id).delete()
    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error("🔥 Error eliminant esdeveniment:", err)
    return NextResponse.json(
      { success: false, error: "Error eliminant esdeveniment" },
      { status: 500 }
    )
  }
}
