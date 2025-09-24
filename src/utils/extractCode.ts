//file: src/utils/extractCode.ts
/**
 * Extreu el codi que va darrere de “#” dins del summary de l’esdeveniment.
 */
export function extractCode(summary: string): string | undefined {
  const m = summary.match(/#(\w+)/)
  return m ? m[1] : undefined
}
