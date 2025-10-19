// ✅ filename: src/services/zoho/sync.ts
// 🔁 SINCRONITZACIÓ ZOHO → FIRESTORE (versió revisada amb camps reals)
// Compatible 100% amb Vercel i Firestore

import { zohoFetch } from '@/services/zoho/auth'
import { firestore } from '@/lib/firebaseAdmin'

export async function syncZohoDealsToFirestore() {
  console.log('🚀 Iniciant sincronització Zoho → Firestore...')

  const moduleName = process.env.ZOHO_CRM_MODULE || 'Deals'
  const fields = [
    'id',
    'Deal_Name',
    'Stage',
    'Tipo_de_lead',
    'Servicio_texto',
    'Finca_2',
    'Espai_2',
    'Nombre_de_persones',
    'Fecha_del_evento',
    'Fecha_y_hora_del_evento',
    'Owner',
  ].join(',')

  // 1️⃣ Lectura completa de Zoho (paginada)
  let allDeals: any[] = []
  let page = 1
  let fetched = 0

  do {
    const data = await zohoFetch<{ data?: any[] }>(
      `/${moduleName}?fields=${fields}&page=${page}&per_page=200`
    )
    const pageData = data?.data || []
    fetched = pageData.length
    allDeals = allDeals.concat(pageData)
    page++
  } while (fetched === 200)

  console.log(`📦 Total oportunitats rebudes de Zoho: ${allDeals.length}`)

  // 2️⃣ Classificació per etapa
  const collections = {
    blau: firestore.collection('stage_blau'),
    taronja: firestore.collection('stage_taronja'),
    verd: firestore.collection('stage_verd'),
  } as const

  function classifyStage(stage: string): 'blau' | 'taronja' | 'verd' | null {
    const s = stage.toLowerCase()
    if (s.includes('prereserva') || s.includes('calentet')) return 'blau'
    if (
      s.includes('segona proposta') ||
      s.includes('proposta confirmada') ||
      s.includes('rq') ||
      s.includes('pendent de signar')
    )
      return 'taronja'
    if (s.includes('pagament') || s.includes('cerrada') || s.includes('prova de menú'))
      return 'verd'
    return null
  }

  // 3️⃣ Normalització i mapping
  const normalizedDeals = allDeals
    .map((d) => {
      const stage = d.Stage || ''
      const colorGroup = classifyStage(stage)
      if (!colorGroup) return null

      const dataEvent = d.Fecha_del_evento || d.Fecha_y_hora_del_evento || null
      const pipeline = d.Tipo_de_lead || d.Pipeline || 'Altres'
      const servei = d.Servicio_texto || ''
      const ubicacio = d.Finca_2 || d.Espai_2 || ''
      const numPax = d.Nombre_de_persones || null

      return {
        idZoho: String(d.id),
        NomEvent: d.Deal_Name || 'Sense nom',
        Stage: stage,
        Servei: servei,
        LN: pipeline,
        Comercial: d?.Owner?.name ?? '—',
        DataInici: dataEvent ? String(dataEvent).slice(0, 10) : null,
        DataFi: dataEvent ? String(dataEvent).slice(0, 10) : null,
        NumPax: numPax,
        Ubicacio: ubicacio,
        Color:
          colorGroup === 'blau'
            ? 'border-blue-300 bg-blue-50 text-blue-800'
            : colorGroup === 'taronja'
            ? 'border-orange-300 bg-orange-50 text-orange-800'
            : 'border-green-300 bg-green-50 text-green-800',
        StageDot:
          colorGroup === 'blau'
            ? 'bg-blue-400'
            : colorGroup === 'taronja'
            ? 'bg-orange-400'
            : 'bg-green-500',
        origen: 'zoho',
        editable: colorGroup === 'verd',
        updatedAt: new Date().toISOString(),
        collection: colorGroup,
      }
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)

  console.log(`✅ Oportunitats vàlides: ${normalizedDeals.length}`)

  // 4️⃣ Escriptura a Firestore
  const batch = firestore.batch()
  let createdCount = 0

  for (const deal of normalizedDeals) {
    const col = collections[deal.collection]
    if (!col) continue
    const docRef = col.doc(deal.idZoho)
    batch.set(docRef, deal, { merge: true })
    createdCount++
  }

  await batch.commit()
  console.log(`🔥 Firestore actualitzat (${createdCount} documents)`)

  // 5️⃣ Eliminació de registres obsolets
  const allCollections = ['stage_blau', 'stage_taronja', 'stage_verd']
  for (const colName of allCollections) {
    const snapshot = await firestore.collection(colName).get()
    const toDelete = snapshot.docs.filter(
      (doc) =>
        !normalizedDeals.find(
          (d) => d.idZoho === doc.id && d.collection === colName.replace('stage_', '')
        )
    )
    for (const doc of toDelete) {
      await firestore.collection(colName).doc(doc.id).delete()
    }
    if (toDelete.length > 0)
      console.log(`🧹 Eliminats ${toDelete.length} registres de ${colName}`)
  }

  // 6️⃣ Resultat final
  return {
    totalCount: allDeals.length,
    createdCount,
    updatedCount: 0,
    removedCount: 0,
  }
}
