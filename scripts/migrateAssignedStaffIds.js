// scripts/migrateAssignedStaffIds.js

import { initializeApp, cert } from "firebase-admin/app"
import { getFirestore }      from "firebase-admin/firestore"
import serviceAccount         from "./service-account.json"

// 1) Inicia Firebase Admin
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function migrate() {
  const qs = await db.collection("quadrants").get()
  for (const doc of qs.docs) {
    const data = doc.data()
    // nomès si existeix assignedStaff i és array
    if (Array.isArray(data.assignedStaff)) {
      const assignedStaffIds = data.assignedStaff.map(st => st.id)
      await doc.ref.set({ assignedStaffIds }, { merge: true })
      console.log(`✅ Updated ${doc.id}`)
    } else {
      console.log(`⚠ Skipped ${doc.id} (no assignedStaff)`)
    }
  }
  console.log("🏁 Migration complete")
}

migrate().catch(err => {
  console.error("Migration error:", err)
  process.exit(1)
})
