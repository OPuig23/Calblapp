import { zohoFetch } from '@/services/zoho/auth'
import { firestore } from '@/lib/firebaseAdmin'

/**
 * 🔁 SINCRONITZACIÓ ZOHO → FIRESTORE
 * Lògica millorada:
 * - Només sincronitza del dia actual en endavant (tots els stages)
 * - Esborra automàticament esdeveniments passats per stage_blau i stage_taronja
 * - Stage_verd només s’actualitza i mai s’esborra
 */
export async function syncZohoDealsToFirestore() {
  console.log('🚀 Iniciant sincronització Zoho → Firestore...')

  const today = new Date().toISOString().slice(0, 10)
  const moduleName = process.env.ZOHO_CRM_MODULE || 'Deals'
  const fields = [
    'id',
    'Deal_Name',
    'Stage',
    'Tipo_de_lead',
    'Producto_2',
    'Men_texto',
    'Finca_2',
    'Espai_2',
    'Nombre_de_persones',
    'Fecha_del_evento',
    'Fecha_y_hora_del_evento',
    'Owner',
  ].join(',')

  // 1️⃣ Lectura completa Zoho (paginada)
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

  // 2️⃣ Classificació d'etapes
  const collections = {
    blau: firestore.collection('stage_blau'),
    taronja: firestore.collection('stage_taronja'),
    verd: firestore.collection('stage_verd'),
  } as const

  const classifyStage = (stage: string): 'blau' | 'taronja' | 'verd' | null => {
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

  // 3️⃣ Normalització i filtre per data (només futur)
  const normalizedDeals = allDeals
    .map((d) => {
      const stage = d.Stage || ''
      const colorGroup = classifyStage(stage)
      if (!colorGroup) return null

      const dataEvent = d.Fecha_del_evento || d.Fecha_y_hora_del_evento || null
      const dateString = dataEvent ? String(dataEvent).slice(0, 10) : null
      if (!dateString || dateString < today) {
        // descarta passats
        return null
      }

      const pipeline = d.Tipo_de_lead || d.Pipeline || 'Altres'
      const servei = d.Producto_2 || d.Men_texto || ''

      const ubicacio = d.Finca_2 || d.Espai_2 || ''
      const numPax = d.Nombre_de_persones || null

      return {
        idZoho: String(d.id),
        NomEvent: d.Deal_Name || 'Sense nom',
        Stage: stage,
        Servei: servei,
        LN: pipeline,
        Comercial: d?.Owner?.name ?? '—',
        DataInici: dateString,
        DataFi: dateString,
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

  console.log(`✅ Oportunitats vàlides (futures): ${normalizedDeals.length}`)

  // 4️⃣ Esborrar registres antics de blau/taronja
  let deletedOldCount = 0
  for (const colName of ['stage_blau', 'stage_taronja']) {
    const snapshot = await firestore.collection(colName).get()
    for (const doc of snapshot.docs) {
      const data = doc.data()
      const docDate = data?.DataInici || ''
      if (docDate < today) {
        await firestore.collection(colName).doc(doc.id).delete()
        deletedOldCount++
      }
    }
  }
  console.log(`🧹 Eliminats ${deletedOldCount} registres antics (blau/taronja)`)

  // 5️⃣ Escriure dades noves
  const batch = firestore.batch()
  let createdCount = 0
  for (const deal of normalizedDeals) {
    const col = collections[deal.collection]
    if (!col) continue
    batch.set(col.doc(deal.idZoho), deal, { merge: true })
    createdCount++
  }

  await batch.commit()
  console.log(`🔥 Firestore actualitzat (${createdCount} nous/actualitzats)`)

  // 6️⃣ Retorn resum
  return {
    totalCount: allDeals.length,
    createdCount,
    deletedOldCount,
  }
}
