// src/utils/normalizeVehicleType.ts

// Funció bàsica per treure accents
const unaccent = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const normalizeVehicleType = (val?: string) => {
  if (!val) return ''
  const v = unaccent(val.toLowerCase().trim().replace(/\s+/g, ''))
  switch (v) {
    case 'furgoneta':
      return 'furgoneta'
    case 'camiopetit':
      return 'camioPetit'
    case 'camiogran':
      return 'camioGran'
    default:
      return val
  }
}
