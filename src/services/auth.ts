// src/services/auth.ts
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

interface CSVUser {
  Nom: string
  Contrasenya: string
  Nivell: string
  Departament: string
}

export async function getUserFromCSV(username: string, password: string) {
  const csvPath = path.join(process.cwd(), "public", "users.csv")
  const file = fs.readFileSync(csvPath, 'utf-8')

  const records: CSVUser[] = parse(file, {
    bom: true,                   // ← ELIMINA EL BOM AL PRINCIPI
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  })

  const found = records.find(
    (u) => u.Nom === username && u.Contrasenya === password
  )

  if (!found) return null

  return {
    name: found.Nom,
    role: found.Nivell,
    department: found.Departament,
  }
}
