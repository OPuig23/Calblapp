// ✅ file: src/services/zoho/sync.ts
import { firestore } from '@/lib/firebaseAdmin'
import { zohoFetch } from '@/services/zoho/auth'

interface ZohoOwner {
  id: string
  name: string
  email?: string
}

interface ZohoDeal {
  id: string
  Deal_Name: string
  Stage: string
  Servicio_texto?: string
  Men_texto?: string
  N_mero_de_invitados?: number
  N_mero_de_personas_del_evento?: number
  Finca_2?: string[]
  Espai_2?: string[]
  Fecha_del_evento?: string | null
  Fecha_y_hora_del_evento?: string | null
  Owner: ZohoOwner
}

interface NormalizedDeal {
  idZoho: string
  NomEvent: string
  Stage: string
  LN: string
  Servei: string
  Comercial: string
  DataInici: string
  DataFi: string
  NumPax: number | string | null
  Ubicacio: string
  Color: string
  StageDot: string
  StageGroup: string
  origen: string
  editable: boolean
  updatedAt: string
  collection: 'blau' | 'taronja' | 'verd'
}

export async function syncZohoDealsToFirestore(): Promise<{
  totalCount: number
  createdCount: number
  deletedCount: number
}> {
  console.info('🚀 Iniciant sincronització Zoho → Firestore')

  const todayISO = new Date().toISOString().slice(0, 10)
  const moduleName = process.env.ZOHO_CRM_MODULE || 'Deals'
  const fields =
    'id,Deal_Name,Stage,Servicio_texto,Men_texto,N_mero_de_invitados,N_mero_de_personas_del_evento,Finca_2,Espai_2,Fecha_del_evento,Fecha_y_hora_del_evento,Owner'

  // 1️⃣ Llegir oportunitats amb paginació
  const allDeals: ZohoDeal[] = []
  for (let page = 1; ; page++) {
    const res = await zohoFetch<{ data?: ZohoDeal[] }>(
      `/${moduleName}?fields=${fields}&page=${page}&per_page=200`
    )
    const data = res.data ?? []
    if (data.length === 0) break
    allDeals.push(...data)
  }

  console.info(`📦 Rebudes ${allDeals.length} oportunitats`)

  // 2️⃣ Funció per determinar LN amb retard per evitar límits
  const getLN = async (ownerId?: string): Promise<string> => {
    if (!ownerId) return 'Altres'
    await new Promise((r) => setTimeout(r, 100)) // 10 req/s
    try {
      const res = await zohoFetch<{ users: { role?: { name?: string } }[] }>(
        `/users/${ownerId}`
      )
      const role = res.users?.[0]?.role?.name?.toLowerCase() ?? ''
      if (role.includes('bodas')) return 'Casaments'
      if (role.includes('corporativo') || role.includes('empresa'))
        return 'Empresa'
      return 'Altres'
    } catch {
      return 'Altres'
    }
  }

  const classifyStage = (stage: string): 'blau' | 'taronja' | 'verd' | null => {
    const s = stage.toLowerCase()
    if (s.includes('prereserva') || s.includes('calentet')) return 'blau'
    if (s.includes('rq') || s.includes('pendent') || s.includes('proposta'))
      return 'taronja'
    if (s.includes('pagament') || s.includes('cerrada ganada')) return 'verd'
    return null
  }

  // 3️⃣ Normalitzar amb control de tipus i retard
  const normalized: NormalizedDeal[] = []
  for (const d of allDeals) {
    const group = classifyStage(d.Stage)
    if (!group) continue

    const eventDate = d.Fecha_del_evento || d.Fecha_y_hora_del_evento
    const dateISO = eventDate ? eventDate.slice(0, 10) : null
    if (!dateISO || dateISO < todayISO) continue

    const LN = await getLN(d.Owner?.id)

    normalized.push({
      idZoho: String(d.id),
      NomEvent: d.Deal_Name || 'Sense nom',
      Stage: d.Stage,
      LN,
      Servei: d.Servicio_texto || d.Men_texto || '',
      Comercial: d.Owner?.name || '—',
      DataInici: dateISO,
      DataFi: dateISO,
      NumPax:
        d.N_mero_de_invitados || d.N_mero_de_personas_del_evento || null,
      Ubicacio: d.Finca_2?.[0] || d.Espai_2?.[0] || '',
      Color:
        group === 'blau'
          ? 'border-blue-300 bg-blue-50 text-blue-800'
          : group === 'taronja'
          ? 'border-orange-300 bg-orange-50 text-orange-800'
          : 'border-green-300 bg-green-50 text-green-800',
      StageDot:
        group === 'blau'
          ? 'bg-blue-400'
          : group === 'taronja'
          ? 'bg-orange-400'
          : 'bg-green-500',
      StageGroup:
        group === 'blau'
          ? 'Prereserva / Calentet'
          : group === 'taronja'
          ? 'Proposta / Pendent signar'
          : 'Confirmat',
      origen: 'zoho',
      editable: group === 'verd',
      updatedAt: new Date().toISOString(),
      collection: group
    })
  }

  console.info(`✅ Oportunitats vàlides: ${normalized.length}`)

  // 4️⃣ Esborrar antics (blau/taronja)
  let deleted = 0
  for (const col of ['stage_blau', 'stage_taronja']) {
    const snap = await firestore.collection(col).get()
    const dels = snap.docs
      .filter((d) => (d.data().DataInici || '') < todayISO)
      .map((d) => d.ref.delete())
    deleted += dels.length
    await Promise.all(dels)
  }

  // 5️⃣ Escriure nous
  const batch = firestore.batch()
  for (const deal of normalized) {
    const ref = firestore.collection(`stage_${deal.collection}`).doc(deal.idZoho)
    batch.set(ref, deal, { merge: true })
  }
  await batch.commit()

  console.info('🔥 Firestore sincronitzat correctament')
  return { totalCount: allDeals.length, createdCount: normalized.length, deletedCount: deleted }
}
