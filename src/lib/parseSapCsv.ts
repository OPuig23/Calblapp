import csv from 'csv-parser'
import { Readable } from 'node:stream'
import stringSimilarity from 'string-similarity'

export type SapRow = {
  ['Nombre IC']?: string
  ['Ultimo empl.dpto.ventas']?: string
  ['Fecha inicio']?: string
  ['Proyecto']?: string
  // … altres columnes ignorades
}

export function normalizeDateToISO(input: string | undefined) {
  if (!input) return ''
  // accepta "DD/MM/YYYY" o "YYYY-MM-DD"
  const s = input.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('/')
    return `${yyyy}-${mm}-${dd}`
  }
  // si ja és ISO:
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return s
}

export function toLower(s?: string) {
  return (s || '').trim().toLowerCase()
}

export function parseSapCsvStream(stream: Readable): Promise<SapRow[]> {
  return new Promise((resolve, reject) => {
    const rows: SapRow[] = []
    stream
      .pipe(csv({ separator: ';' }))
      .on('data', (r: any) => rows.push(r as SapRow))
      .on('end', () => resolve(rows))
      .on('error', reject)
  })
}

export function isFuzzyMatch(
  sapName: string,
  fsName: string,
  threshold = 0.8
) {
  const score = stringSimilarity.compareTwoStrings(toLower(sapName), toLower(fsName))
  return score >= threshold
}
