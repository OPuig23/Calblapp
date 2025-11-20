/**
 * IMPORTADOR DE CENTRES PROPIS → A LA COL·LECCIÓ "finques"
 * Llegeix "Centres de cost.xlsx" i puja directament a Firestore
 * Filtra CCC i afegeix LN segons prefix del codi
 */

import admin from "firebase-admin";
import xlsx from "xlsx";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Fix per __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialitzar Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Helpers
const unaccent = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const slugify = (t) =>
  unaccent(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// LN per prefix de codi
const getLN = (code) => {
  if (code.startsWith("CCB")) return "Casaments";
  if (code.startsWith("CCE")) return "Empresa";
  if (code.startsWith("CCR")) return "Grups Restaurants";
  if (code.startsWith("CCF")) return "Foodlovers";
  return null;
};

// Carregar Excel
const excelPath = path.join(__dirname, "Centres de cost.xlsx");
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

async function importFinques() {
  console.log("=== IMPORTANT A LA COL·LECCIÓ 'finques' ===");

  let count = 0;

  for (const row of rows) {
    const code = String(row["Códi"] || "").trim();
    const name = String(row["Descripció"] || "").trim();

    if (!code || !name) {
      console.log("⚠️ Saltant fila sense dades:", row);
      continue;
    }

    // Filtrar CCC
    if (code.startsWith("CCC")) {
      console.log("⏩ Saltant (CCC no s'importa):", code);
      continue;
    }

    const LN = getLN(code);
    if (!LN) {
      console.log("⏩ Saltant (prefix no reconegut):", code);
      continue;
    }

    const slug = slugify(name);

    const ref = db.collection("finques").doc(code);

    await ref.set(
      {
        code,
        nom: name,
        slug,
        LN,
        searchable: `${name} ${code}`.toLowerCase(),
        origen: "excel_centres_cost_2025",
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("✔️ Importada finca:", code);
    count++;
  }

  console.log(`=== IMPORTACIÓ COMPLETADA → ${count} finques ===`);
}

importFinques().catch(console.error);
