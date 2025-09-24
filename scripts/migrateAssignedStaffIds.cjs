// scripts/migrateAssignedStaffIds.cjs

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

// 1) Inicialitza Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// 2) Funció de migració
async function migrate() {
  const qs = await db.collection("quadrants").get();
  for (const doc of qs.docs) {
    const data = doc.data();
    if (Array.isArray(data.assignments)) {
      const assignedStaffIds = data.assignments.map(st => st.id);
      await doc.ref.set({ assignedStaffIds }, { merge: true });
      console.log(`✅ Updated ${doc.id}`);
    } else {
      console.log(`⚠ Skipped ${doc.id} (no assignments)`);
    }
  }
  console.log("🏁 Migration complete");
}

migrate().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
