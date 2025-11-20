//file: src/services/zoho/sync.ts
import { firestoreAdmin as firestore } from '@/lib/firebaseAdmin'

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

// ─────────────────────────────
// HELPERS GLOBALS (necessaris a tot el fitxer)
// ─────────────────────────────

const unaccent = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const stripCode = (t: string) =>
  t.replace(/\s*\([^)]+\)\s*/g, "").trim();

const stripZZ = (t: string) =>
  t.replace(/^ZZRestaurant\s*/i, "").replace(/^ZZ\s*/i, "").trim();

const slugify = (t: string) =>
  unaccent(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isBadCode = (code?: string | null) =>
  code === "CCB00001" || code === "CCE00004";

const extractCodeFromName = (raw: string): string | null => {
  const match = raw.match(/\(([A-Z0-9]{3,})\)/i);
  return match ? match[1].toUpperCase() : null;
};

const nextCEUCode = (currentMax: string | null): string => {
  const base = "CEU";
  if (!currentMax || !currentMax.startsWith(base)) {
    return "CEU000173";
  }
  const num = parseInt(currentMax.slice(3), 10) || 172;
  const next = num + 1;
  return `${base}${next.toString().padStart(6, "0")}`;
};
function normalizeName(raw: string): string {
  if (!raw) return '';

  return raw
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // treure accents
    .toLowerCase()
    .replace(/\bzz\b/g, "")
    .replace(/\bcasaments\b/g, "")
    .replace(/\bempresa\b/g, "")
    .replace(/\brestaurant\b/g, "")
    .replace(/\bcasament\b/g, "")
    .replace(/\bgrup\b/g, "")
    .replace(/\bcb\b/g, "")
    .replace(/-/g, " ")                // treure guions
    .replace(/\s+/g, " ")              // compactar espais
    .trim()
    .split(" ")                         // agafar només la primera paraula significativa
    .slice(0, 2)                        // (ex: "grifols sant cugat" → "grifols sant")
    .join(" ");
}
function matchExcelZoho(nomExcel: string, nomZoho: string): boolean {
  const a = normalizeName(nomExcel);
  const b = normalizeName(nomZoho);

  if (!a || !b) return false;

  // Coincidència tolerant
  return (
    a === b ||
    a.includes(b) ||
    b.includes(a)
  );
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

// ─────────────────────────────────────────────
// 7️⃣ Sincronització dels STAGE (verd, taronja, blau)
// Regles:
//   - Stage VERD té prioritat absoluta
//   - Mai eliminem events verds històrics
//   - Eliminem només taronja/blau incorrectes o antics
// ─────────────────────────────────────────────

// 7.0 — Mapes d’IDs per estat real (segons Zoho)
const idsVerd = new Set<string>();
const idsTaronja = new Set<string>();
const idsBlau = new Set<string>();

for (const deal of normalized) {
  if (deal.collection === 'verd') idsVerd.add(deal.idZoho);
  else if (deal.collection === 'taronja') idsTaronja.add(deal.idZoho);
  else if (deal.collection === 'blau') idsBlau.add(deal.idZoho);
}

// ─────────────────────────────────────────────
// 7.1 — ESCRIURE STAGE VERD (PRIORITARI)
//   - Actualitzem només els que arriben
//   - No s’elimina cap verd antic
// ─────────────────────────────────────────────
const batchVerd = firestore.batch();

for (const deal of normalized) {
  if (deal.collection !== 'verd') continue;

  const ref = firestore.collection('stage_verd').doc(deal.idZoho);
  batchVerd.set(ref, deal, { merge: true });
}

await batchVerd.commit();
console.info(`🟢 stage_verd actualitzat: ${idsVerd.size} deals`);


// ─────────────────────────────────────────────
// 7.2 — ESCRIURE TARONJA I BLAU (NOMÉS SI NO SÓN VERDS)
//   - Si és verd → no escriure a taronja/blau
// ─────────────────────────────────────────────
const batchOthers = firestore.batch();

for (const deal of normalized) {
  const id = deal.idZoho;

  // No escriure mai res que sigui verd
  if (idsVerd.has(id)) continue;

  if (deal.collection === 'taronja') {
    const ref = firestore.collection('stage_taronja').doc(id);
    batchOthers.set(ref, deal, { merge: true });
  }

  if (deal.collection === 'blau') {
    const ref = firestore.collection('stage_blau').doc(id);
    batchOthers.set(ref, deal, { merge: true });
  }
}

await batchOthers.commit();
console.info(`🟠🔵 Taronja/blau escrits respectant la prioritat de verd`);


// ─────────────────────────────────────────────
// 7.3 — NETEJA: NOMÉS TARONJA I BLAU
//   ❌ Mai eliminar res de stage_verd
//   ✔ Eliminar taronja/blau que ja no són així segons Zoho
//   ✔ Eliminar taronja/blau que ara són verds
// ─────────────────────────────────────────────

const colNeteja = [
  { name: 'stage_taronja', idsActuals: idsTaronja },
  { name: 'stage_blau', idsActuals: idsBlau },
];

for (const { name, idsActuals } of colNeteja) {
  const snap = await firestore.collection(name).get();

  for (const doc of snap.docs) {
    const id = doc.id;

    // 1) Si ara és verd → eliminar d’aquí
    if (idsVerd.has(id)) {
      await doc.ref.delete();
      console.log(`🧹 Eliminat de ${name} (ara és verd): ${id}`);
      continue;
    }

    // 2) Si ja no està en aquest estat a Zoho → eliminar
    if (!idsActuals.has(id)) {
      await doc.ref.delete();
      console.log(`🧹 Eliminat de ${name} (ja no és ${name} a Zoho): ${id}`);
    }
  }
}

console.info("✨ Neteja final de stage_taronja i stage_blau completada");

// ─────────────────────────────────────────────
// 8️⃣ Actualitzar col·lecció FINQUES (matching avançat)
//   - Matching pel NOM (mai pel codi de Zoho)
//   - Codis dolents: CCB00001 i CCE00004
//   - Evitar duplicats (inclús dins la mateixa sincronització)
//   - CEU incremental consistent
// ─────────────────────────────────────────────

try {
  // Carregar finques existents
  const finquesSnap = await firestore.collection("finques").get();

  const existingCodes = new Set<string>();
  const existingNames = new Map<string, string>(); // nomNet → code
  let maxCEU: string | null = null;

  // Guardem dades existents
  for (const doc of finquesSnap.docs) {
    const d = doc.data();
    const code = (d.code || "").toString().trim();
    const nom = (d.nom || "").toString().trim();

    const nomNet = normalizeName(nom);

    if (code) existingCodes.add(code);
    if (nomNet) existingNames.set(nomNet, code);

    if (code.startsWith("CEU")) {
      if (!maxCEU || code > maxCEU) maxCEU = code;
    }
  }

  // Per evitar duplicats dins la mateixa execució
  const newlyCreated = new Map<string, string>(); // nomNet → CEUxxxxxx

  const batchFinques = firestore.batch();
  let created = 0;

  // Processar cada oportunitat
  for (const deal of normalized) {
    const rawNom = deal.Ubicacio || "";
    if (!rawNom) continue;

    const nomNetZoho = normalizeName(rawNom);

    // 1️⃣ Si ja existeix (Excel o centresPropis)
    if (existingNames.has(nomNetZoho)) {
      continue;
    }

    // 2️⃣ Si ja s’ha creat fa 30 segons en aquesta mateixa sync
    if (newlyCreated.has(nomNetZoho)) {
      continue;
    }

    // 3️⃣ Intentar extreure codi del nom
    let code = extractCodeFromName(rawNom);

    // Codis “dolents” → s’ignoren sempre
    if (code === "CCB00001" || code === "CCE00004") {
      code = null;
    }

    // Si el codi existeix a Firestore → NO crear res, fer match pel nom
    if (code && existingCodes.has(code)) {
      // Com que el nom no coincideix amb cap existent, NO fem res.
      // (Només faríem match si el nom coincideix. Si no, es tracta com un espai nou.)
      continue;
    }

    // 4️⃣ Si no tenim codi → generar CEU
    if (!code) {
      const next = nextCEUCode(maxCEU);
      code = next;
      maxCEU = next;
    }

    // Evitar duplicats finals
    if (existingCodes.has(code)) continue;

    // 5️⃣ Assignació LN segons prefix
    let LN = "";
    if      (code.startsWith("CCB")) LN = "Casaments";
    else if (code.startsWith("CCE")) LN = "Empreses";
    else if (code.startsWith("CCR")) LN = "Restaurants";
    else if (code.startsWith("CCF")) LN = "Foodlovers";
    else if (code.startsWith("CEU")) LN = deal.LN;

    // 6️⃣ Crear finca nova
    const ref = firestore.collection("finques").doc(code);

    batchFinques.set(ref, {
      code,
      nom: rawNom.replace(/\(.*?\)/, "").trim(),
      nomNet: nomNetZoho,
      LN,
      searchable: `${rawNom} ${code}`.toLowerCase(),
      origen: "zoho",
      updatedAt: new Date().toISOString(),
    });

    existingCodes.add(code);
    newlyCreated.set(nomNetZoho, code);
    created++;
  }

  // Guardar tot
  if (created > 0) {
    await batchFinques.commit();
    console.info(`🏡 Finques: afegides ${created} noves (sense duplicats).`);
  } else {
    console.info("🏡 Finques: cap alta nova (matching correcte).");
  }

} catch (err) {
  console.error("⚠️ Error actualitzant finques:", err);
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
