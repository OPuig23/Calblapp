// ===========================================================================
// IMPORTADOR COMPLET DE FINQUES (EMPRESA + CASAMENTS)
// - Processa tots els fitxers .xlsx de dues carpetes
// - Suporta múltiples pestanyes
// - Match per nom / cuina.nom
// - Si troba -> actualitza produccio
// - Si no troba -> crea finca nova amb CEUxxxxx
// - Extracció de blocs + seccions laterals
// ===========================================================================

import admin from "firebase-admin"
import xlsx from "xlsx"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// 🔐 Firebase
// ---------------------------------------------------------------------------

const serviceAccount = JSON.parse(
  fs.readFileSync("../serviceAccountKey.json", "utf8")
)

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "cal-blay-webapp.firebasestorage.app",
  })
}

const db = admin.firestore()
const bucket = admin.storage().bucket()

// ---------------------------------------------------------------------------
// 🧩 Helpers
// ---------------------------------------------------------------------------

const normalize = (s) =>
  s
    ?.toString()
    ?.normalize("NFD")
    ?.replace(/[\u0300-\u036f]/g, "")
    ?.replace(/[^a-zA-Z0-9\s]/g, " ")
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.toLowerCase() || ""

const getCell = (sheet, r, c) => {
  const cell = sheet[xlsx.utils.encode_cell({ r, c })]
  return cell?.v ? cell.v.toString() : ""
}

function extractMainBlock(sheet, startRow, endRow) {
  const lines = []

  for (let r = startRow; r <= endRow; r++) {
    const parts = []
    for (let c = 1; c <= 4; c++) {
      const v = getCell(sheet, r, c)
      if (v) parts.push(v)
    }
    const line = parts.join(" ").trim()
    if (line) lines.push(line)
  }

  return lines
}

function extractSideSections(sheet, startRow, endRow) {
  const HEADER_ROW = startRow - 1
  const PRIMARY_END = 4
  const MAX_COL = 20

  const sections = {}
  const sectionCols = []

  for (let c = PRIMARY_END + 1; c <= MAX_COL; c++) {
    const header = getCell(sheet, HEADER_ROW, c).trim()
    if (header) {
      sectionCols.push({ col: c, name: header })
      sections[header] = []
    }
  }

  for (const sec of sectionCols) {
    const { col, name } = sec

    for (let r = startRow; r <= endRow; r++) {
      const parts = []
      for (let c = col; c <= MAX_COL; c++) {
        const v = getCell(sheet, r, c)
        if (v) parts.push(v)
      }

      const line = parts.join(" ").trim()
      if (line) sections[name].push(line)
    }
  }

  return sections
}

function extractBlock(sheet, start, end) {
  return {
    main: extractMainBlock(sheet, start, end),
    side: extractSideSections(sheet, start, end),
  }
}

// ---------------------------------------------------------------------------
// 🔢 Generar proper codi CEUxxxxx
// ---------------------------------------------------------------------------

async function generateNextCode() {
  const snap = await db.collection("finques").get()

  let max = 0

  snap.forEach((doc) => {
    const d = doc.data()
    if (d.code?.startsWith("CEU")) {
      const num = parseInt(d.code.replace("CEU", ""), 10)
      if (!isNaN(num) && num > max) max = num
    }
  })

  const next = max + 1
  return "CEU" + String(next).padStart(5, "0")
}

// ---------------------------------------------
// 🔍 MATCH DE NOM ULTRA ROBUST
// ---------------------------------------------

function cleanName(name) {
  if (!name) return "";

  return name
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")         // accents
    .replace(/\(.*?\)/g, "")                 // treure parèntesis
    .replace(/[-_/]/g, " ")                  // guions a espai
    .toLowerCase()
    .replace(/\b(sala|espai|restaurant|masia|gran|la|el|de|del|d)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Retorna TRUE si són el mateix espai
function isMatch(a, b) {
  const A = cleanName(a);
  const B = cleanName(b);

  if (!A || !B) return false;

  // Igual exacta
  if (A === B) return true;

  // Primeres 2 paraules
  const a2 = A.split(" ").slice(0, 2).join(" ");
  const b2 = B.split(" ").slice(0, 2).join(" ");
  if (a2 === b2) return true;

  // Conte / és contingut
  if (A.includes(B) || B.includes(A)) return true;

  return false;
}

async function findMatch(normName) {
  const target = cleanName(normName);

  const snap = await db.collection("finques").get();

  for (const doc of snap.docs) {
    const d = doc.data();

    const noms = [
      d.nom,
      d.nomNormalitzat,
      d.nomPestanya,
      d.nomPestanyaNorm,
      d.cuina?.nom
    ];

    for (const n of noms) {
      if (isMatch(target, n)) {
        return doc.id;
      }
    }
  }

  return null;
}


// ---------------------------------------------------------------------------
// 🔄 Processar un fitxer Excel complet
// ---------------------------------------------------------------------------

async function processExcel(filePath, origenLN) {
  const fileName = path.basename(filePath, ".xlsx")
  const fileNameNorm = normalize(fileName)

  const workbook = xlsx.readFile(filePath)
  const sheetNames = workbook.SheetNames

  // Pujar a Storage un cop
  const destPath = `finques/${origenLN}/${fileName.replace(/\s+/g, "_")}.xlsx`
  await bucket.upload(filePath, { destination: destPath })
  const fitxaUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`

  console.log(`📁 Fitxer: ${fileName}.xlsx → Pestanyes:`, sheetNames)

  for (const tab of sheetNames) {
    const sheet = workbook.Sheets[tab]
    const fincaName = `${fileName}_${tab}`
    const fincaNorm = normalize(fincaName)

    // ➜ Intentar match amb el nom base
    const docId = await findMatch(fileNameNorm)

    const office = extractBlock(sheet, 3, 14)
    const aperitiu = extractBlock(sheet, 17, 28)
    const observacions = extractBlock(sheet, 31, 37)

    let ref = null
    let data = {}

    if (docId) {
      // ---------------------------------------
      // ✔️ Actualitzar finca existent
      // ---------------------------------------
      console.log("   ✔️ Match:", docId)
      ref = db.collection("finques").doc(docId)

      data = {
  nomPestanya: fincaName,
  nomPestanyaNorm: fincaNorm,
  produccio: {
    office: office.main,
    aperitiu: aperitiu.main,
    observacions: observacions.main,
    ...office.side,
    ...aperitiu.side,
    ...observacions.side,
    fitxaUrl,
    images: [],
    updatedAt: Date.now(),
  },
}

    } else {
      // ---------------------------------------
      // ➕ Crear finca nova (CEUxxxxx)
      // ---------------------------------------
      const newCode = await generateNextCode()
      console.log("   ➕ Nova finca:", newCode)

      ref = db.collection("finques").doc()

      data = {
        code: newCode,
        nom: fileName,                     // 👈 Nom base REAL
        nomNormalitzat: fileNameNorm,      // 👈 Nom normalitzat del fitxer
        nomPestanya: fincaName,            // 👈 Nom complet amb pestanya
        nomPestanyaNorm: fincaNorm,          // 👈 Normalitzat amb pestanya

        ln: origenLN,
        produccio: {
          office: office.main,
          aperitiu: aperitiu.main,
          observacions: observacions.main,
          ...office.side,
          ...aperitiu.side,
          ...observacions.side,
          fitxaUrl,
          images: [],
          updatedAt: Date.now(),
        },
        createdAt: Date.now(),
      }
    }

    await ref.set(data, { merge: true })
    console.log("   ✔️ Guardat:", ref.id)
  }
}

// ---------------------------------------------------------------------------
// ▶️ EXECUCIÓ GLOBAL
// ---------------------------------------------------------------------------

async function run() {
  console.log("=== INICI SINCRONITZACIÓ FINQUES ===")

  const DIR_EMPRESA =
    "C:/Users/PORTATIL66/OneDrive - Cal Blay/Escritorio/dev/01 MAT ESPAIS EXTERNS EMPRESA"

  const DIR_CASAMENTS =
    "C:/Users/PORTATIL66/OneDrive - Cal Blay/Escritorio/dev/02 MAT ESPAIS EXTERNS CASAMENTS"

  // ------ EMPRESA ------
  console.log("📌 PROCESSANT EMPRESA…")
  const filesEmpresa = fs
    .readdirSync(DIR_EMPRESA)
    .filter((f) => f.endsWith(".xlsx"))

  for (const file of filesEmpresa) {
    await processExcel(path.join(DIR_EMPRESA, file), "Empresa")
  }

  // ------ CASAMENTS ------
  console.log("📌 PROCESSANT CASAMENTS…")
  const filesCasaments = fs
    .readdirSync(DIR_CASAMENTS)
    .filter((f) => f.endsWith(".xlsx"))

  for (const file of filesCasaments) {
    await processExcel(path.join(DIR_CASAMENTS, file), "Casaments")
  }

  console.log("=== FI SINCRONITZACIÓ FINQUES ===")
}

// Execute
run().catch(console.error)
