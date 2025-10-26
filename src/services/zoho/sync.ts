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
  DataInici: string | null
  DataFi: string | null
  HoraInici?: string | null
  NumPax: number | string | null
  Ubicacio: string
  Color: string
  StageDot: string
  StageGroup: string
  origen: string
  editable: boolean
  updatedAt: string
  collection: 'blau' | 'taronja' | 'verd' | string
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
  'id,Deal_Name,Stage,Servicio_texto,Men_texto,C_digo,N_mero_de_invitados,N_mero_de_personas_del_evento,Finca_2,Espai_2,Fecha_del_evento,Fecha_y_hora_del_evento,Durac_n_del_evento,Owner'

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

// ✅ Filtra només les oportunitats amb data d'avui o futura
const today = new Date().toISOString().slice(0, 10)
const filteredDeals = allDeals.filter((d) => {
  const eventDate = (d.Fecha_del_evento || d.Fecha_y_hora_del_evento || '').slice(0, 10)
  return eventDate >= today
})

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
  for (const d of filteredDeals) {

    const group = classifyStage(d.Stage)
    if (!group) continue

   const eventDateTime = d.Fecha_y_hora_del_evento || d.Fecha_del_evento
let dateISO: string | null = null
let hora: string | null = null

if (eventDateTime) {
  const parts = eventDateTime.split('T')
  dateISO = parts[0]
  hora = parts[1]?.slice(0, 5) || null // ⏱️ format HH:mm
}


// ⏱️ Calcula DataFi segons Durac_n_del_evento
let dataFiISO = dateISO
const duracio = Number(d['Durac_n_del_evento'] || 1)

if (dateISO && !isNaN(duracio) && duracio > 1) {
  const fi = new Date(dateISO)
  fi.setDate(fi.getDate() + (duracio - 1))
  dataFiISO = fi.toISOString().slice(0, 10)
}


    let LN = await getLN(d.Owner?.id)

// ✅ Si la finca o espai conté la paraula "restaurant", forcem la LN
const ubicacions = [
  ...(d.Finca_2 || []),
  ...(d.Espai_2 || [])
]
const teRestaurant = ubicacions.some((u) =>
  u?.toLowerCase().includes('restaurant')
)

if (teRestaurant) LN = 'Grups Restaurants'


    normalized.push({
      idZoho: String(d.id),
      NomEvent: d.Deal_Name || 'Sense nom',
      Stage: d.Stage,
      LN,
      Servei: d.Servicio_texto || d.Men_texto || '',
      Comercial: d.Owner?.name || '—',
      DataInici: dateISO,
      DataFi: dataFiISO,
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
      collection: group,
      HoraInici: hora,

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

// 6️⃣ Actualitzar col·lecció "finques" amb dades úniques de Zoho
try {
  const finquesSet = new Set<string>()

  // 🔹 Recollim Finca_2 i Espai_2
  for (const d of allDeals) {
    if (Array.isArray(d.Finca_2)) {
      d.Finca_2.forEach((f) => f && finquesSet.add(f.trim()))
    }
    if (Array.isArray(d.Espai_2)) {
      d.Espai_2.forEach((e) => e && finquesSet.add(e.trim()))
    }
  }

  const finquesArr = Array.from(finquesSet).filter(Boolean)

  // 🧹 Esborrem contingut antic
  const snap = await firestore.collection('finques').get()
  const dels = snap.docs.map((doc) => doc.ref.delete())
  await Promise.all(dels)

  // 🔥 Inserim només finques amb codi (ex: "Font de la Canya (CCE00004)")
  const batchFinques = firestore.batch()
  const regexCodi = /\(([A-Z0-9]{7,})\)/ // busca (CXXXXXX)

  for (const nomRaw of finquesArr) {
    const match = nomRaw.match(regexCodi)
    if (!match) continue // ❌ descarta sense codi

    const codi = match[1]
    const nomNet = nomRaw.replace(/\s*\([^)]+\)\s*/g, '').trim() // elimina (CXXXXXX)
    const searchable = (nomNet + ' ' + codi).toLowerCase()

    const ref = firestore.collection('finques').doc(codi)
    batchFinques.set(ref, {
      nom: nomNet,
      codi,
      searchable,
      updatedAt: new Date().toISOString(),
      origen: 'zoho',
    })
  }

  await batchFinques.commit()
  console.info('🏡 Col·lecció "finques" actualitzada amb codis vàlids.')

  // 🧾 Actualitzar col·lecció "serveis" amb codis vàlids
try {
  const serveisSet = new Set<string>()
  const serveisMap = new Map<string, string>() // codi → nom

  // 🔹 Recollim Servicio_texto + C_digo només d'oportunitats verdes i amb un sol codi
for (const d of allDeals) {
  const stage = (d.Stage || '').toLowerCase()
  const codiRaw = d['C_digo']?.trim() || ''
  const nomRaw = d.Servicio_texto?.trim() || ''

  // ✅ Només si l'etapa és "verde" i hi ha un sol codi (sense comes)
  if (
    stage.includes('cerrada ganada') &&
    codiRaw &&
    !codiRaw.includes(',') &&
    nomRaw
  ) {
    serveisSet.add(codiRaw)
    serveisMap.set(codiRaw, nomRaw)
  }
}


  // 🧹 Esborrem contingut antic
  const snap = await firestore.collection('serveis').get()
  const dels = snap.docs.map((doc) => doc.ref.delete())
  await Promise.all(dels)

  // 🏗️ Inserim serveis amb codi
  const batchServeis = firestore.batch()
  for (const codi of serveisSet) {
    const nom = serveisMap.get(codi) || ''
    const searchable = (nom + ' ' + codi).toLowerCase()
    const ref = firestore.collection('serveis').doc(codi)
    batchServeis.set(ref, {
      nom,
      codi,
      searchable,
      updatedAt: new Date().toISOString(),
      origen: 'zoho',
    })
  }

  await batchServeis.commit()
  console.info('🧾 Col·lecció "serveis" actualitzada amb codis vàlids.')
} catch (err) {
  console.error('⚠️ Error actualitzant col·lecció serveis:', err)
}

} catch (err) {
  console.error('⚠️ Error actualitzant col·lecció finques:', err)
}

  console.info('🔥 Firestore sincronitzat correctament')
  return { totalCount: allDeals.length, createdCount: normalized.length, deletedCount: deleted }
}
