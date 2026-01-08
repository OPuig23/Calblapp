// file: src/app/menu/spaces/info/SpaceDetailClient.tsx
'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { canEditFinca } from '@/lib/accessControl'




/**
 * Tipus base del que esperem rebre des del servidor.
 * Pots adaptar-lo al que realment tens a Firestore.
 */
export type EspaiDetall = {
  id: string
  code?: string
  nom: string
  ubicacio?: string
  ln?: string
  origen?: string
  tipus?: 'Propi' | 'Extern'
  comercial?: {
    notes?: string
    condicions?: string
    contacte?: string
    telefon?: string
    email?: string
  }
  produccio?: {
    office?: string[]
    aperitiu?: string[]
    observacions?: string[]
    fitxaUrl?: string
    images?: string[]
    // Altres seccions laterals: "EVENTS GRANS", "CAIXA DE POTÈNCIES", etc.
    [clau: string]: any
  }
}

type Props = {
  espai: EspaiDetall
  lnOptions?: string[]
  onClose?: () => void
  onSave?: (data: EspaiDetall) => Promise<void> | void
  forceReadOnly?: boolean
}

export default function SpaceDetailClient({
  espai,
  onClose,
  onSave,
  forceReadOnly = false,
}: Props) {
  // ─────────────────────────────────────────────
  // 1) Estat local (còpia editable de la finca)
  // ─────────────────────────────────────────────
  const router = useRouter()
  const { data: session } = useSession()

  const canEditRole = canEditFinca({
    role: session?.user?.role,
    department: (session?.user as any)?.departmentLower ?? (session?.user as any)?.department,
  })
  const canEdit = !forceReadOnly && canEditRole
  const readOnly = !canEdit
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Derivem tipus per defecte segons el codi (CC* = Propi)
  const tipusInicial: 'Propi' | 'Extern' =
    espai.tipus ||
    (espai.code && espai.code.startsWith('CC') ? 'Propi' : 'Extern')

  const [code, setCode] = useState(espai.code || '')
  const [nom, setNom] = useState(espai.nom || '')
  const [ubicacio, setUbicacio] = useState(espai.ubicacio || '')
  const [ln, setLn] = useState(espai.ln || '')
  const [tipus, setTipus] = useState<'Propi' | 'Extern'>(tipusInicial)

  // Bloc comercial
  const [comNotes, setComNotes] = useState(
    espai.comercial?.notes || ''
  )
  const [comCondicions, setComCondicions] = useState(
    espai.comercial?.condicions || ''
  )
  const [comContacte, setComContacte] = useState(
    espai.comercial?.contacte || ''
  )
  const [comTelefon, setComTelefon] = useState(
    espai.comercial?.telefon || ''
  )
  const [comEmail, setComEmail] = useState(
    espai.comercial?.email || ''
  )

  // Producció: blocs principals en format textarea (1 línia = 1 ítem)
  const produccio = espai.produccio || {}

  const [officeText, setOfficeText] = useState(
    (produccio.office || []).join('\n')
  )
  const [aperitiuText, setAperitiuText] = useState(
    (produccio.aperitiu || []).join('\n')
  )
  const [obsText, setObsText] = useState(
    (produccio.observacions || []).join('\n')
  )

  const [fitxaUrl, setFitxaUrl] = useState(produccio.fitxaUrl || '')

  // Seccions laterals (Events grans, Caixa de potències, etc.)
  // Agafem totes les claus de produccio que no siguin les principals
  const sideSectionKeys = useMemo(() => {
    const base = ['office', 'aperitiu', 'observacions', 'fitxaUrl', 'images']
    return Object.keys(produccio).filter((k) => !base.includes(k))
  }, [produccio])

  // Guardem un estat per a cada secció lateral com a textarea
  const [sideSections, setSideSections] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {}
      for (const key of sideSectionKeys) {
        const val = produccio[key]
        if (Array.isArray(val)) {
          initial[key] = val.join('\n')
        } else if (typeof val === 'string') {
          initial[key] = val
        } else {
          initial[key] = ''
        }
      }
      return initial
    }
  )

  // Imatges (llista d’URLs)
  const [images, setImages] = useState<string[]>(produccio.images || [])
  const [newImageUrl, setNewImageUrl] = useState('')

  const addImage = () => {
    const url = newImageUrl.trim()
    if (!url) return
    setImages((prev) => [...prev, url])
    setNewImageUrl('')
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }
async function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('fincaId', espai.id)

  const res = await fetch('/api/spaces/upload', {
    method: 'POST',
    body: form,
  })

  const data = await res.json()
  if (!data.url) {
    throw new Error('Error pujant imatge')
  }

  setImages(prev => [...prev, data.url])
}
useEffect(() => {
  function handlePaste(e: ClipboardEvent) {
    const item = e.clipboardData?.items?.[0]
    if (!item) return
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) uploadImage(file)
    }
  }

  window.addEventListener('paste', handlePaste)
  return () => window.removeEventListener('paste', handlePaste)
}, [])

  // ─────────────────────────────────────────────
  // 2) Preparar payload per desar
  // ─────────────────────────────────────────────
  const buildPayload = (): EspaiDetall => {
    // Helper per convertir textarea → array de línies
    const toLines = (txt: string) =>
      txt
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean)

    const produccioFinal: EspaiDetall['produccio'] = {
      ...produccio,
      office: toLines(officeText),
      aperitiu: toLines(aperitiuText),
      observacions: toLines(obsText),
      fitxaUrl: fitxaUrl.trim() || undefined,
      images,
    }

    // Seccions laterals
    for (const key of Object.keys(sideSections)) {
      produccioFinal![key] = toLines(sideSections[key])
    }

    return {
      id: espai.id,
      code: code.trim() || undefined,
      nom: nom.trim(),
      ubicacio: ubicacio.trim() || undefined,
      ln: ln.trim() || undefined,
      origen: espai.origen,
      tipus,
      comercial: {
        notes: comNotes.trim() || undefined,
        condicions: comCondicions.trim() || undefined,
        contacte: comContacte.trim() || undefined,
        telefon: comTelefon.trim() || undefined,
        email: comEmail.trim() || undefined,
      },
      produccio: produccioFinal,
    }
  }

// ─────────────────────────────────────────────
// 3) Acció de desar: envia payload al backend
// ─────────────────────────────────────────────
const handleSave = async () => {
  if (!canEdit) return
  setError(null)
  setSuccess(null)
  setSaving(true)

  try {
    const payload = buildPayload()

    const res = await fetch('/api/spaces/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error || 'Error desant espai')
    }

    setSuccess('Canvis desats correctament.')
  } catch (err) {
    console.error('❌ Error desant:', err)
    setError('Hi ha hagut un error en desar els canvis.')
  } finally {
    setSaving(false)
  }
}

const handleDelete = async () => {
  if (!canEdit || deleting) return

  const confirmDelete = window.confirm(
    `Vols eliminar l'espai "${nom || espai.nom}"? Aquesta accio no es pot desfer.`
  )
  if (!confirmDelete) return

  setError(null)
  setSuccess(null)
  setDeleting(true)

  try {
    const res = await fetch(`/api/spaces/${espai.id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(json.error || 'Error eliminant espai')
    }

    if (onClose) {
      onClose()
    } else {
      const ts = Date.now()
      router.push(`/menu/spaces/info?refresh=${ts}`)
    }
  } catch (err) {
    console.error('Error eliminant espai:', err)
    setError('Hi ha hagut un error en eliminar el registre.')
  } finally {
    setDeleting(false)
  }
}


  // ─────────────────────────────────────────────
  // 4) Render
  // ─────────────────────────────────────────────
  return (
    <section className="w-full max-w-6xl mx-auto p-4 pb-20">
      {/* Capçalera */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {nom || 'Finca sense nom'}
          </h1>
          <p className="text-sm text-gray-500">
            Codi: <span className="font-mono">{code || '—'}</span> ·{' '}
            {tipus === 'Propi' ? '🏠 Espai propi' : '📍 Espai extern'}
          </p>
        </div>

        <div className="flex gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Tancar
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                disabled={saving || deleting}
                onClick={handleDelete}
                className="px-4 py-2 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-60"
              >
                {deleting ? 'Eliminant...' : 'Eliminar'}
              </button>
              <button
                type="button"
                disabled={saving || deleting}
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Desant...' : 'Desar canvis'}
              </button>
            </>
          )}


        </div>
      </div>

      {/* Missatges d’estat */}
      {error && (
        <div className="mb-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm px-3 py-2">
          {success}
        </div>
      )}

      {/* GRID PRINCIPAL */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* ───────────────── General ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Informació general
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Codi
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm font-mono"
                placeholder="CEU00001 / CCB00001..."
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Nom
              </label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                placeholder="Nom de la masia / espai"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Ubicació
              </label>
              <input
                value={ubicacio}
                onChange={(e) => setUbicacio(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                placeholder="Població, adreça, referències..."
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  LN
                </label>
                <select
  value={ln}
  onChange={(e) => setLn(e.target.value)}
  disabled={!canEdit}
  className="w-full border rounded-lg px-2 py-1.5 text-sm"
>
  <option value="">—</option>
  <option value="Empresa">Empresa</option>
  <option value="Casaments">Casaments</option>
  <option value="Grups Restaurants">Grups Restaurants</option>
  <option value="Foodlovers">Foodlovers</option>
  <option value="Altres">Altres</option>
</select>

              </div>

              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  Tipus
                </label>
                <select
                  value={tipus}
                  onChange={(e) =>
                    setTipus(e.target.value as 'Propi' | 'Extern')
                  }
                  disabled={!canEdit}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="Propi">Masia / espai propi</option>
                  <option value="Extern">Espai extern</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ───────────────── Comercial ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Informació comercial
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Contacte
              </label>
              <input
                value={comContacte}
                onChange={(e) => setComContacte(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                placeholder="Nom contacte principal"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  Telèfon
                </label>
                <input
                  value={comTelefon}
                  onChange={(e) => setComTelefon(e.target.value)}
                  disabled={!canEdit}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="+34 ..."
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">
                  Email
                </label>
                <input
                  value={comEmail}
                  onChange={(e) => setComEmail(e.target.value)}
                  disabled={!canEdit}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm"
                  placeholder="contacte@..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Notes comercials
              </label>
              <textarea
                value={comNotes}
                onChange={(e) => setComNotes(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[70px]"
                placeholder="Notes d’acord, històric, restriccions, etc."
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Condicions especials
              </label>
              <textarea
                value={comCondicions}
                onChange={(e) => setComCondicions(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[70px]"
                placeholder="Horaris, exclusivitats, limitacions de música, etc."
              />
            </div>
          </div>
        </motion.div>

        {/* ───────────────── Producció ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-2"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Informació de producció
          </h2>

          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Cuina / Office
              </label>
              <textarea
                value={officeText}
                onChange={(e) => setOfficeText(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[120px]"
                placeholder="1 ítem per línia"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Aperitiu / Sala / Begudes
              </label>
              <textarea
                value={aperitiuText}
                onChange={(e) => setAperitiuText(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[120px]"
                placeholder="1 ítem per línia"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Observacions
              </label>
              <textarea
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[120px]"
                placeholder="Comentaris generals de producció..."
              />
            </div>
          </div>

          {/* Seccions laterals dinàmiques */}
          {sideSectionKeys.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
              {sideSectionKeys.map((key) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">
                    {key}
                  </label>
                  <textarea
                    value={sideSections[key] || ''}
                    onChange={(e) =>
                      setSideSections((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    disabled={!canEdit}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm min-h-[100px]"
                    placeholder="1 ítem per línia"
                  />
                </div>
              ))}
            </div>
          )}


        </motion.div>

        {/* ───────────────── Imatges ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-2"
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Imatges de l’espai
          </h2>

          <div className="flex flex-wrap gap-3 mb-3">
            {images.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="w-24 h-24 rounded-lg border overflow-hidden relative bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
<img
  src={url}
  alt=""
  className="w-full h-full object-cover cursor-default"
/>


                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0 right-0 m-1 rounded-full bg-black/60 text-white text-[11px] px-1"
                >
                  ×
                </button>
              </div>
            ))}

            {images.length === 0 && (
              <p className="text-xs text-gray-400">
                Encara no hi ha imatges. Pots enganxar URLs d’imatge (Drive, web,
                etc.).
              </p>
            )}
          </div>

{/* DROPZONE/PASTEZONE MODERN */}
<div
  className="mt-4 w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 text-gray-500 text-sm cursor-pointer hover:border-blue-400 transition"
  onClick={() => document.getElementById('fileInput')?.click()}
  onDragOver={(e) => e.preventDefault()}
  onDrop={async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadImage(file)
  }}
>
  📸 <span className="font-medium text-gray-600">Arrossega, clica o enganxa una imatge</span>
  <p className="text-xs mt-1 text-gray-400">També pots fer Ctrl+V</p>
</div>

<input
  id="fileInput"
  type="file"
  accept="image/*"
  className="hidden"
  onChange={async (e) => {
    const file = e.target.files?.[0]
    if (file) await uploadImage(file)
  }}
/>


        </motion.div>
      </div>
    </section>
  )
}
