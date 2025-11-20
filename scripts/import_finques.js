// ==========================================================
// IMPORTADOR DE FINQUES — PAS 1
// Importa el fitxer finques.xlsx a Firestore
// Regles:
// - Si code comença per "CC" → NO TOCAR
// - Si code comença per "CEU" → SOBREESCRIURE TOT
// ==========================================================

import admin from "firebase-admin";
import xlsx from "xlsx";
import { readFileSync } from "fs";

// ----------------------------------------------
// 1. Inicialitzar Firebase Admin
// ----------------------------------------------
const serviceAccount = JSON.parse(
  readFileSync("../serviceAccountKey.json", "utf8")

);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ----------------------------------------------
// 2. Carregar l'Excel
// ----------------------------------------------
const workbook = xlsx.readFile("./finques.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

// ----------------------------------------------
// 3. Funció principal
// ----------------------------------------------
async function importFinques() {
  console.log("=== INICIANT IMPORTACIÓ FINQUES (PAS 1) ===");

  for (const row of rows) {
    const code = row["Code"]?.toString().trim();

    if (!code) {
      console.log("⚠️ SALTANT fila sense codi:", row);
      continue;
    }

    // Regla 1 → No tocar les finques amb codi CC
    if (code.startsWith("CC")) {
      console.log("⏩ SALTANT (codi CC):", code);
      continue;
    }

    // Construir l'objecte Firestore
    const data = {
      code: code,
      nom: row["ESPAI"] ?? null,
      localitzacio: row["LOCALITZACIÓ"] ?? null,
      capacitatMaxima: row["CAPACITAT MÀXIMA"] ?? null,
      LN: "Empresa",
      comercial: {
        contacte: row["CONTACTE"] ?? null,
        telefon: row["TELÈFON"] ?? null,
        mail: row["MAIL"] ?? null,
        percentatgeComissio: row["% COM."] ?? null,
        facturacioExtra: row["Facturacio Extra"] ?? null,
      },
      cuina: {
        fee: row["FEE CUINA"] ?? null,
      },
      logisticaGeneral: row["LOGÍSTICA"] ?? null,
      personalReferenciat: row["LLISTAT PERSONAL"] ?? null,
      observacions: row["OBSERVACIONS"] ?? null,
      origen: "excel_comercial_2025",
      updatedAt: Date.now(),
    };

    // Escriure a Firestore
    await db.collection("finques").doc(code).set(data, { merge: false });

    console.log("✔️ Importada finca:", code);
  }

  console.log("=== IMPORTACIÓ FINALITZADA ===");
}

// Run
importFinques().catch(console.error);
