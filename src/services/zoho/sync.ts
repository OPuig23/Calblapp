//file: src/services/zoho/sync.ts
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
  Servicio_texto?: string | null
  Men_texto?: string | null
  N_mero_de_invitados?: number | string | null
  N_mero_de_personas_del_evento?: number | string | null
  Finca_2?: string[] | null
  Espai_2?: string[] | null
  Fecha_del_evento?: string | null
  Fecha_y_hora_del_evento?: string | null
  Durac_n_del_evento?: number | string | null
  C_digo?: string | null
  Owner: ZohoOwner
  Fecha_de_petici_n?: string | null
  Precio_Total?: number | string | null
  Amount?: number | string | null
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
  DataPeticio?: string | null
  PreuMenu?: number | string | null
  Import?: number | string | null
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
  'id,Deal_Name,Stage,Servicio_texto,Men_texto,C_digo,N_mero_de_invitados,N_mero_de_personas_del_evento,Finca_2,Espai_2,Fecha_del_evento,Fecha_y_hora_del_evento,Durac_n_del_evento,Owner,Fecha_de_petici_n,Precio_Total,Amount'


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

  // 2️⃣ Filtra només les oportunitats amb data d’avui o futura
  const today = new Date().toISOString().slice(0, 10)
  const filteredDeals = allDeals.filter((d) => {
    const eventDate = (d.Fecha_del_evento || d.Fecha_y_hora_del_evento || '').slice(0, 10)
    return eventDate >= today
  })

  // 3️⃣ Funció per determinar LN segons propietari
  const getLN = async (ownerId?: string): Promise<string> => {
    if (!ownerId) return 'Altres'
    await new Promise((r) => setTimeout(r, 100))
    try {
      const res = await zohoFetch<{ users: { role?: { name?: string } }[] }>(
        `/users/${ownerId}`
      )
      const role = res.users?.[0]?.role?.name?.toLowerCase() ?? ''
      if (role.includes('bodas')) return 'Casaments'
      if (role.includes('corporativo') || role.includes('empresa')) return 'Empresa'
      if (role.includes('comida preparada') || role.includes('preparada')) return 'Precuinats'
      return 'Agenda'
    } catch {
      return 'Agenda'
    }
  }

  // 4️⃣ Classifica etapes (Stage) — incloent 'RQ' com a verd
  const classifyStage = (stage: string): 'blau' | 'taronja' | 'verd' | null => {
    const s = stage.toLowerCase()
    if (s.includes('prereserva') || s.includes('calentet')) return 'blau'
    if (s.includes('pagament') || s.includes('cerrada ganada') || s.includes('rq')) return 'verd'
    if (s.includes('pendent') || s.includes('proposta')) return 'taronja'
    return null
  }

  // 5️⃣ Normalitzar oportunitats
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
      hora = parts[1]?.slice(0, 5) || null
    }

// ⏱️ Calcula DataFi segons duració
let dataFiISO = dateISO
const duracio = Number(d.Durac_n_del_evento ?? 1)

if (dateISO && !isNaN(duracio) && duracio > 1) {
  const fi = new Date(dateISO)
  fi.setDate(fi.getDate() + (duracio - 1))
  dataFiISO = fi.toISOString().slice(0, 10)
}


    let LN = await getLN(d.Owner?.id)

    // Si la finca conté “restaurant” → Grups Restaurants
    const ubicacions = [...(d.Finca_2 || []), ...(d.Espai_2 || [])]
    const teRestaurant = ubicacions.some((u) => u?.toLowerCase().includes('restaurant'))
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
      HoraInici: hora,
      NumPax: d.N_mero_de_invitados || d.N_mero_de_personas_del_evento || null,
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
      DataPeticio: d.Fecha_de_petici_n || null,
      PreuMenu: d.Precio_Total || null,
      Import: d.Amount || null,
    })
  }

  console.info(`✅ Oportunitats vàlides: ${normalized.length}`)

  // 6️⃣ Esborrar antics (només blau i taronja)
  let deleted = 0
  for (const col of ['stage_blau', 'stage_taronja']) {
    const snap = await firestore.collection(col).get()
    const dels = snap.docs
      .filter((d) => (d.data().DataInici || '') < todayISO)
      .map((d) => d.ref.delete())
    deleted += dels.length
    await Promise.all(dels)
  }

  // 7️⃣ Escriure nous registres
  const batch = firestore.batch()
  for (const deal of normalized) {
    const ref = firestore.collection(`stage_${deal.collection}`).doc(deal.idZoho)
    batch.set(ref, deal, { merge: true })
  }
  await batch.commit()

  // 8️⃣ Actualitzar col·lecció FINQUES (sense eliminar, upsert per nom)
  try {
    const finquesRaw = new Set<string>()
    for (const d of allDeals) {
;(d.Finca_2 ?? []).forEach((f) => f && finquesRaw.add(f.trim()))
;(d.Espai_2 ?? []).forEach((e) => e && finquesRaw.add(e.trim()))

    }

    const stripCode = (t: string) => t.replace(/\s*\([^)]+\)\s*/g, '').trim()
    const stripZZ = (t: string) =>
      t.replace(/^ZZRestaurant\s*/i, '').replace(/^ZZ\s*/i, '').trim()
    const slug = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const existSnap = await firestore.collection('finques').get()
    const existing = new Set<string>()
    existSnap.docs.forEach((doc) => {
      const n = (doc.data().nom as string) || ''
      existing.add(slug(stripZZ(stripCode(n))))
    })

    const batchFinques = firestore.batch()
    let created = 0

    for (const nomRaw of Array.from(finquesRaw)) {
      const nomNet = stripZZ(stripCode(nomRaw))
      const norm = slug(nomNet)
      if (!norm || existing.has(norm)) continue
      const match = nomRaw.match(/\(([A-Z0-9]{3,})\)/i)
      const codi = match ? match[1] : norm
      const ref = firestore.collection('finques').doc(codi)
      batchFinques.set(ref, {
        nom: nomNet,
        codi,
        searchable: `${nomNet} ${codi}`.toLowerCase(),
        updatedAt: new Date().toISOString(),
        origen: 'zoho',
      })
      created++
    }

    if (created > 0) {
      await batchFinques.commit()
      console.info(`🏡 Finques: afegides ${created} noves (sense esborrar).`)
    } else console.info('🏡 Finques: cap alta nova.')
  } catch (err) {
    console.error('⚠️ Error actualitzant finques:', err)
  }

  // 9️⃣ Actualitzar col·lecció SERVEIS (sense eliminar, upsert per nom)
  try {
    const serveisRaw = new Set<string>()
    for (const d of allDeals) {
      const nom = (d.Servicio_texto || d.Men_texto || '').trim()
      if (nom) serveisRaw.add(nom)
    }

    const slug = (t: string) =>
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    const existSnap = await firestore.collection('serveis').get()
    const existing = new Set<string>()
    existSnap.docs.forEach((doc) => {
      const n = (doc.data().nom as string) || ''
      existing.add(slug(n))
    })

    const batchServeis = firestore.batch()
    let created = 0

    for (const nomRaw of Array.from(serveisRaw)) {
      const norm = slug(nomRaw)
      if (!norm || existing.has(norm)) continue
      const ref = firestore.collection('serveis').doc(norm)
      batchServeis.set(ref, {
        nom: nomRaw,
        codi: norm,
        searchable: `${nomRaw} ${norm}`.toLowerCase(),
        updatedAt: new Date().toISOString(),
        origen: 'zoho',
      })
      created++
    }

    if (created > 0) {
      await batchServeis.commit()
      console.info(`🧾 Serveis: afegits ${created} nous (sense esborrar).`)
    } else console.info('🧾 Serveis: cap alta nova.')
  } catch (err) {
    console.error('⚠️ Error actualitzant serveis:', err)
  }

  console.info('🔥 Firestore sincronitzat correctament')
  return {
    totalCount: allDeals.length,
    createdCount: normalized.length,
    deletedCount: deleted,
  }
}
