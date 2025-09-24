// scripts/cleanupNotifications.js
import { firestore } from "../src/lib/firebaseAdmin.js"

async function cleanup() {
  const snap = await firestore.collectionGroup("notifications").get()
  let deleted = 0

  for (const doc of snap.docs) {
    const data = doc.data()
    if (!data.personId) {
      await doc.ref.delete()
      deleted++
      console.log("🗑️ Eliminada notificació sense personId:", doc.id)
    }
  }

  console.log(`✅ Neteja completa. Total eliminades: ${deleted}`)
}

cleanup().catch(err => {
  console.error("❌ Error durant la neteja:", err)
  process.exit(1)
})
