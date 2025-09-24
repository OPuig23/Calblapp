// src/services/userService.ts
export type UserAlias = {
  authId: string
  name?: string
  aliases?: string[]
}

/** Heurística simple per detectar que una cadena “sembla un nom”
 *  (lletres llatines amb accents, espais, guions, punts, apòstrofs) */
function looksLikeName(s: string): boolean {
  // Interval llatí ampliat per accents comuns
  const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\s.\-']+$/u
  return s.length > 0 && s.length <= 40 && NAME_RE.test(s)
}

/** Resol de UID → nom/àlies (Firestore 'users' o fallback local) */
export async function resolveWorkerAlias(authIdOrName: string): Promise<UserAlias | null> {
  const q = String(authIdOrName || '').trim()
  if (!q) return null

  // Si ja sembla un nom (no UID), retorna’l com a “name”
  if (looksLikeName(q)) {
    return { authId: q, name: q, aliases: [q] }
  }

  // Firestore (opcional): col·lecció 'users' amb { authId, name, aliases[] }
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const admin = await import('firebase-admin')
    if (admin.apps.length === 0) admin.initializeApp({})
    const db = getFirestore()

    const snap = await db.collection('users').where('authId', '==', q).limit(1).get()
    if (!snap.empty) {
      const d = snap.docs[0].data() || {}
      return {
        authId: String(d.authId || q),
        name: d.name ? String(d.name) : undefined,
        aliases: Array.isArray(d.aliases) ? d.aliases.map(String) : undefined,
      }
    }
  } catch {
    // si no hi ha Firestore disponible, seguim amb fallback
  }

  // Fallback local provisional mentre no tens la col·lecció 'users'
  const LOCAL_FALLBACK: UserAlias[] = [
    { authId: '90KihhI3rk8IQkhSgZEK', name: 'Carata', aliases: ['Carata', 'Carlos'] },
    // afegeix-ne més si cal
  ]
  const hit = LOCAL_FALLBACK.find(x => x.authId === q)
  return hit ?? null
}
