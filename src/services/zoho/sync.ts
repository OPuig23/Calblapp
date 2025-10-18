// ✅ filename: src/services/zoho/sync.ts
import { zohoFetch } from '@/services/zoho/auth'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * 🔁 SINCRONITZACIÓ ZOHO → FIRESTORE
 * - Llegeix totes les oportunitats del mòdul Deals de Zoho CRM
 * - Classifica segons StageDot (blau, taronja, verd)
 * - Desa a les col·leccions: stage_blau, stage_taronja, stage_verd
 * - Esborra documents antics si canvien d’etapa
 */

export async function syncZohoDealsToFirestore() {
  console.log('🚀 Iniciant sincronització Zoho → Firestore...')

  const moduleName = process.env.ZOHO_CRM_MODULE || 'Deals'
  const fields = [
    'id',
    'Deal_Name',
    'Stage',
    'Pipeline',
    'Fecha_del_evento',
    'Fecha_y_hora_del_evento',
    'Owner',
    'Service_Type',
    'Venue_Name',
    'Hora_Inici',
    'Num_Pax',
  ].join(',')

  // 1️⃣ LECTURA COMPLETA DE ZOHO (PAGINADA)
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

  // 2️⃣ CLASSIFICACIÓ PER ETAPA
  const collections = {
    blau: firestore.collection('stage_blau'),
    taronja: firestore.collection('stage_taronja'),
    verd: firestore.collection('stage_verd'),
  } as const

  function classifyStage(stage: string, pipeline: string): 'blau' | 'taronja' | 'verd' | null {
    const s = stage.toLowerCase()
    const p = pipeline.toLowerCase()
    if (s.includes('prereserva') || s.includes('calentet')) return 'blau'
    if (
      s.includes('segona proposta') ||
      s.includes('proposta confirmada') ||
      s.includes('rq') ||
      s.includes('pendent de signar')
    )
      return 'taronja'
    if (s.includes('pagament') || s.includes('cerrada ganada') || s.includes('prova de menú'))
      return 'verd'
    return null
  }

  // 3️⃣ NORMALITZACIÓ
  const normalizedDeals = allDeals
    .map((d) => {
      const pipeline = d.Pipeline || d.Service_Type || 'Altres'
      const stage = d.Stage || ''
      const colorGroup = classifyStage(stage, pipeline)
      if (!colorGroup) return null

      const dataEvent = d.Fecha_del_evento || d.Fecha_y_hora_del_evento || null

      return {
        idZoho: String(d.id),
        NomEvent: d.Deal_Name || 'Sense nom',
        Stage: stage,
        Servei: pipeline,
        LN: pipeline,
        Comercial: d?.Owner?.name ?? '—',
        DataInici: dataEvent ? String(dataEvent).slice(0, 10) : null,
        DataFi: dataEvent ? String(dataEvent).slice(0, 10) : null,
        Hora: d.Hora_Inici || null,
        NumPax: d.Num_Pax || null,
        Ubicacio: d.Venue_Name || '',
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

  // 4️⃣ ESCRIPTURA A FIRESTORE
  let createdCount = 0
  const batch = firestore.batch()

  for (const deal of normalizedDeals) {
    const group = deal.collection
    const col = collections[group]
    if (!col) {
      console.warn(`⚠️ Col·lecció desconeguda per deal ${deal.idZoho}:`, group)
      continue
    }
    const docRef = col.doc(deal.idZoho)
    batch.set(docRef, deal, { merge: true })
    createdCount++
  }

  await batch.commit()
  console.log(`🔥 Firestore actualitzat (${createdCount} documents)`)

  // 5️⃣ ELIMINACIÓ DE REGISTRES OBSOLETS
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

  // 6️⃣ RESULTAT FINAL
  return {
    totalCount: allDeals.length,
    createdCount,
    updatedCount: 0,
    removedCount: 0,
  }
}
