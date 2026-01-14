// Import dishes (plats) from the allergens Excel into Firestore.
// Usage:
//   node scripts/import_plats_allergens.js [path-to-xlsx] [--sheet SHEET_NAME] [--dry-run]

const admin = require("firebase-admin")
const xlsx = require("xlsx")
const fs = require("fs")
const path = require("path")

const DEFAULT_FILE = path.join(__dirname, "Al.lergens.xlsx")
const args = process.argv.slice(2)

let filePath = DEFAULT_FILE
let sheetName = null
let dryRun = false

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === "--sheet" && args[i + 1]) {
    sheetName = args[i + 1]
    i++
    continue
  }
  if (arg === "--dry-run") {
    dryRun = true
    continue
  }
  if (!arg.startsWith("--")) {
    filePath = arg
  }
}

if (!path.isAbsolute(filePath)) {
  filePath = path.resolve(process.cwd(), filePath)
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`)
  process.exit(1)
}

const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json")
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Missing service account: ${serviceAccountPath}`)
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"))

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

const db = admin.firestore()

const normalize = (value) =>
  value
    ?.toString()
    ?.normalize("NFD")
    ?.replace(/[\u0300-\u036f]/g, "")
    ?.replace(/[^a-zA-Z0-9]+/g, " ")
    ?.replace(/\s+/g, " ")
    ?.trim()
    ?.toLowerCase() || ""

const slugify = (value) =>
  normalize(value).replace(/\s+/g, "-")

const toString = (value) => (value == null ? "" : String(value)).trim()

const parseAllergenValue = (value) => {
  const raw = toString(value).toUpperCase()
  if (!raw) return null
  if (raw.startsWith("S")) return "SI"
  if (raw.startsWith("N")) return "NO"
  if (raw.startsWith("T")) return "T"
  return null
}

const parseApt = (value) => {
  const raw = normalize(value)
  if (!raw) return null
  if (raw.includes("no apte")) return false
  if (raw.includes("apte")) return true
  return null
}

const parseMenus = (value) => {
  const raw = normalize(value)
  if (!raw) return []

  const tokens = raw.split(/\s+/).filter(Boolean)
  const menus = new Set()

  for (const token of tokens) {
    if (/^c\d+$/i.test(token)) {
      menus.add(token.toUpperCase())
      continue
    }
    if (/^ch\d+$/i.test(token)) {
      menus.add(token.toUpperCase())
      continue
    }
    if (token.startsWith("cel")) {
      menus.add("CELIAC")
    }
  }

  return Array.from(menus)
}

const ALLERGEN_HEADERS = {
  gluten: "gluten",
  crustacis: "crustacis",
  ou: "ou",
  peix: "peix",
  cacauet: "cacauet",
  soja: "soja",
  lactosa: "lactosa",
  "fruits secs": "fruitsSecs",
  api: "api",
  mostassa: "mostassa",
  sesam: "sesam",
  sulfits: "sulfits",
  tramus: "tramus",
  moluscs: "moluscs",
  "mol luscs": "moluscs",
}

const findHeaderRow = (rows) => {
  return rows.findIndex((row) => {
    const normalized = row.map((cell) => normalize(cell))
    const allergenCount = normalized.filter((cell) => ALLERGEN_HEADERS[cell])
      .length
    const hasName = normalized.some((cell) =>
      ["referencies", "articles", "article"].some((key) =>
        cell.startsWith(key)
      )
    )
    const hasCode = normalized.some((cell) => cell === "num codi" || cell === "codi")
    return allergenCount >= 4 && (hasName || hasCode)
  })
}

const findColumnIndex = (headers, candidates) => {
  for (const candidate of candidates) {
    const idx = headers.findIndex(
      (header) => header === candidate || header.startsWith(candidate)
    )
    if (idx >= 0) return idx
  }
  return -1
}

async function run() {
  const workbook = xlsx.readFile(filePath, { cellDates: true })
  const sheetNamesToProcess = sheetName
    ? [sheetName]
    : workbook.SheetNames.slice()

  const docs = []
  const seen = new Set()
  const categories = new Map()
  const families = new Map()
  const menusCatalog = new Map()

  const counters = {
    sheets: 0,
    total: 0,
    sections: 0,
    imported: 0,
    skippedEmpty: 0,
    skippedMissing: 0,
    duplicates: 0,
    categories: 0,
    families: 0,
    menus: 0,
  }

  for (const sheetKey of sheetNamesToProcess) {
    const sheet = workbook.Sheets[sheetKey]
    if (!sheet) {
      console.error(`Sheet not found: ${sheetKey}`)
      continue
    }

    counters.sheets++

    const familyLabel = toString(sheetKey) || null
    const family = familyLabel ? slugify(familyLabel) : null
    if (family) families.set(family, familyLabel)

    const rows = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    })

    const headerRowIndex = findHeaderRow(rows)

    if (headerRowIndex === -1) {
      console.warn(
        `Header row not found in sheet '${sheetKey}' (expected 'Num codi').`
      )
      continue
    }

    const headers = rows[headerRowIndex].map((cell) => normalize(cell))
    const cols = {
      code: findColumnIndex(headers, ["num codi", "codi"]),
      nameCa: findColumnIndex(headers, ["referencies", "articles", "article"]),
      onEstan: findColumnIndex(headers, ["on estan", "cocktail", "menu", "menus"]),
      vegetarian: findColumnIndex(headers, ["vegetaria"]),
      vegan: findColumnIndex(headers, ["vega"]),
      nameEs: findColumnIndex(headers, ["esp"]),
      nameEn: findColumnIndex(headers, ["eng"]),
    }

    const allergenCols = {}
    headers.forEach((header, index) => {
      const key = ALLERGEN_HEADERS[header]
      if (key) allergenCols[key] = index
    })

    if (cols.code === -1 && headers[0] === "" && cols.nameCa === 1) {
      cols.code = 0
    }

    if (cols.code === -1 || cols.nameCa === -1) {
      console.warn(
        `Missing required columns in sheet '${sheetKey}': 'Num codi' or name column.`
      )
      continue
    }

    let currentCategory = null
    const onEstanHeaderRaw =
      cols.onEstan >= 0 ? toString(rows[headerRowIndex][cols.onEstan]) : ""
    const onEstanHeaderNorm = cols.onEstan >= 0 ? headers[cols.onEstan] : ""

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r]
      if (!row || row.every((cell) => !toString(cell))) {
        counters.skippedEmpty++
        continue
      }

      const codeRaw = cols.code >= 0 ? toString(row[cols.code]) : ""
      const nameCaRaw = cols.nameCa >= 0 ? toString(row[cols.nameCa]) : ""

      if (!codeRaw && !nameCaRaw) {
        counters.skippedEmpty++
        continue
      }

      const codeNorm = normalize(codeRaw)

      const rowHasOtherData = row.some((cell, idx) => {
        if (idx === cols.code || idx === cols.nameCa) return false
        return toString(cell) !== ""
      })

      if (codeNorm === "no" || (!codeRaw && nameCaRaw && !rowHasOtherData)) {
        currentCategory = nameCaRaw
        counters.sections++
        const categorySlug = slugify(currentCategory)
        if (categorySlug) categories.set(categorySlug, currentCategory)
        continue
      }

      const code = codeRaw
      const nameCa = nameCaRaw

      if (!code || !nameCa) {
        counters.skippedMissing++
        console.warn(
          `Skipping row ${r + 1} in sheet '${sheetKey}': missing required code or name.`,
          codeRaw,
          nameCaRaw
        )
        continue
      }

      if (seen.has(code)) {
        counters.duplicates++
        console.warn(
          `Duplicate code skipped at row ${r + 1} in sheet '${sheetKey}': ${code}`
        )
        continue
      }

      let onEstanRaw = cols.onEstan >= 0 ? toString(row[cols.onEstan]) : ""
      if (!onEstanRaw && onEstanHeaderNorm && onEstanHeaderNorm !== "on estan") {
        onEstanRaw = onEstanHeaderRaw
      }
      const menus = parseMenus(onEstanRaw)
      menus.forEach((menu) => menusCatalog.set(menu, menu))

      const vegan = parseApt(cols.vegan >= 0 ? row[cols.vegan] : null)
      let vegetarian = parseApt(
        cols.vegetarian >= 0 ? row[cols.vegetarian] : null
      )
      if (vegan === true) vegetarian = true

      const allergens = {}
      Object.entries(allergenCols).forEach(([key, index]) => {
        allergens[key] = parseAllergenValue(row[index])
      })

      const data = {
        code,
        name: {
          ca: nameCa,
          es: cols.nameEs >= 0 ? toString(row[cols.nameEs]) || null : null,
          en: cols.nameEn >= 0 ? toString(row[cols.nameEn]) || null : null,
        },
        category: currentCategory ? slugify(currentCategory) : null,
        categoryLabel: currentCategory || null,
        family: family || null,
        familyLabel: familyLabel,
        menus,
        onEstanRaw: onEstanRaw || null,
        allergens,
        consumption: {
          vegan: vegan ?? null,
          vegetarian: vegetarian ?? null,
        },
        importSource: path.basename(filePath),
        importSheet: familyLabel,
        updatedAt: Date.now(),
      }

      docs.push({ id: code, data })
      seen.add(code)
      counters.imported++
    }
  }

  counters.total = docs.length

  console.log("=== IMPORT SUMMARY ===")
  console.log(`File: ${filePath}`)
  console.log(
    `Sheets: ${sheetName ? sheetName : sheetNamesToProcess.join(", ")}`
  )
  console.log(`Sheets processed: ${counters.sheets}`)
  console.log(`Imported docs: ${counters.imported}`)
  console.log(`Sections: ${counters.sections}`)
  console.log(`Skipped empty: ${counters.skippedEmpty}`)
  console.log(`Skipped missing: ${counters.skippedMissing}`)
  console.log(`Duplicates: ${counters.duplicates}`)
  console.log(`Categories: ${categories.size}`)
  console.log(`Families: ${families.size}`)
  console.log(`Menus: ${menusCatalog.size}`)

  if (dryRun) {
    console.log("Dry run enabled. No data written.")
    return
  }

  const BATCH_LIMIT = 450
  let batch = db.batch()
  let batchCount = 0

  const commitBatch = async () => {
    if (batchCount === 0) return
    await batch.commit()
    batch = db.batch()
    batchCount = 0
  }

  for (const doc of docs) {
    const ref = db.collection("plats").doc(doc.id)
    batch.set(ref, doc.data, { merge: true })
    batchCount++
    if (batchCount >= BATCH_LIMIT) {
      await commitBatch()
    }
  }

  for (const [id, label] of categories.entries()) {
    const ref = db.collection("categories").doc(id)
    batch.set(
      ref,
      {
        label,
        updatedAt: Date.now(),
        source: "import_plats_allergens",
      },
      { merge: true }
    )
    batchCount++
    if (batchCount >= BATCH_LIMIT) {
      await commitBatch()
    }
  }

  for (const [id, label] of families.entries()) {
    const ref = db.collection("family").doc(id)
    batch.set(
      ref,
      {
        label,
        updatedAt: Date.now(),
        source: "import_plats_allergens",
      },
      { merge: true }
    )
    batchCount++
    if (batchCount >= BATCH_LIMIT) {
      await commitBatch()
    }
  }

  for (const [id, label] of menusCatalog.entries()) {
    const ref = db.collection("menus").doc(id)
    batch.set(
      ref,
      {
        label,
        updatedAt: Date.now(),
        source: "import_plats_allergens",
      },
      { merge: true }
    )
    batchCount++
    if (batchCount >= BATCH_LIMIT) {
      await commitBatch()
    }
  }

  await commitBatch()
  console.log("Import finished.")
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
