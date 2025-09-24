// File: src/utils/normalize.ts

export function normalize(str?: string): string {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}
