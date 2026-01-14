'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEFAULT_ALLERGENS } from '@/data/allergens'
import { getVisibleModules } from '@/lib/accessControl'
import { db } from '@/lib/firebaseClient'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'

type AllergenValue = 'SI' | 'NO' | 'T' | ''

type AllergenItem = {
  key: string
  label: string
}

type NameMeta = {
  es?: { auto?: boolean; reviewed?: boolean }
  en?: { auto?: boolean; reviewed?: boolean }
}

type OptionItem = {
  id: string
  label: string
}

type FormState = {
  code: string
  nameCa: string
  nameEs: string
  nameEn: string
  nameMeta: NameMeta
  categoryId: string
  familyId: string
  menus: string[]
  menusRaw: string
  vegan: boolean
  vegetarian: boolean
  allergens: Record<string, AllergenValue>
}

const buildAllergensState = (
  source: Record<string, string | null> = {},
  list: AllergenItem[] = DEFAULT_ALLERGENS
): Record<string, AllergenValue> => {
  const state: Record<string, AllergenValue> = {}
  list.forEach(({ key }) => {
    const value = source?.[key]
    state[key] = value === 'SI' || value === 'NO' || value === 'T' ? value : ''
  })
  return state
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()

const slugify = (value: string) => normalize(value).replace(/\s+/g, '-')

const parseMenus = (value: string) => {
  const raw = normalize(value)
  if (!raw) return []

  const tokens = raw.split(/\s+/).filter(Boolean)
  const menus = new Set<string>()

  for (const token of tokens) {
    if (/^c\d+$/i.test(token)) {
      menus.add(token.toUpperCase())
      continue
    }
    if (/^ch\d+$/i.test(token)) {
      menus.add(token.toUpperCase())
      continue
    }
    if (token.startsWith('cel')) {
      menus.add('CELIAC')
    }
  }

  return Array.from(menus)
}

const normalizeMenuId = (value: string) =>
  normalize(value).replace(/\s+/g, '').toUpperCase()

const formatMenuLabel = (value: string) => value.trim().toUpperCase()

const toAllergenKey = (value: string) => {
  const parts = normalize(value).split(' ').filter(Boolean)
  return parts
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('')
}

const DEFAULT_ALLERGEN_KEYS = new Set(DEFAULT_ALLERGENS.map(allergen => allergen.key))

const defaultFormState: FormState = {
  code: '',
  nameCa: '',
  nameEs: '',
  nameEn: '',
  nameMeta: {},
  categoryId: '',
  familyId: '',
  menus: [],
  menusRaw: '',
  vegan: false,
  vegetarian: false,
  allergens: buildAllergensState(),
}

const EMPTY_SELECT = '__none__'

const ALLERGEN_OPTIONS: Array<{ value: AllergenValue | typeof EMPTY_SELECT; label: string }> = [
  { value: EMPTY_SELECT, label: '—' },
  { value: 'NO', label: 'No' },
  { value: 'T', label: 'Traces' },
  { value: 'SI', label: 'Sí' },
]

export default function AllergensBbddPage() {
  const { data: session } = useSession()
  const user = session?.user

  const allowed = useMemo(() => {
    const module = getVisibleModules({
      role: user?.role,
      department: user?.department,
    }).find(mod => mod.path === '/menu/allergens')
    return module?.submodules?.some(sub => sub.path === '/menu/allergens/bbdd')
  }, [user?.role, user?.department])

  const [form, setForm] = useState<FormState>(defaultFormState)
  const [categories, setCategories] = useState<OptionItem[]>([])
  const [families, setFamilies] = useState<OptionItem[]>([])
  const [menusCatalog, setMenusCatalog] = useState<OptionItem[]>([])
  const [allergensCatalog, setAllergensCatalog] = useState<AllergenItem[]>(DEFAULT_ALLERGENS)
  const [allergensSource, setAllergensSource] = useState<'default' | 'db'>('default')
  const [originalAllergens, setOriginalAllergens] = useState<Record<string, string | null>>({})
  const [extraAllergens, setExtraAllergens] = useState<AllergenItem[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newFamily, setNewFamily] = useState('')
  const [newMenu, setNewMenu] = useState('')
  const [newAllergen, setNewAllergen] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)

  const menuItems = useMemo(() => {
    const known = new Set(menusCatalog.map(item => item.id))
    const combined = [...menusCatalog]
    form.menus.forEach(menuId => {
      if (!known.has(menuId)) combined.push({ id: menuId, label: menuId })
    })
    return combined
  }, [menusCatalog, form.menus])

  const allergenItems = useMemo(() => {
    const known = new Set(allergensCatalog.map(item => item.key))
    const combined = [...allergensCatalog]
    extraAllergens.forEach(item => {
      if (!known.has(item.key)) combined.push(item)
    })
    return combined
  }, [allergensCatalog, extraAllergens])

  const customAllergens = useMemo(
    () => allergensCatalog.filter(item => !DEFAULT_ALLERGEN_KEYS.has(item.key)),
    [allergensCatalog]
  )

  useEffect(() => {
    const loadOptions = async () => {
      const [categorySnap, familySnap, menuSnap, allergenSnap] = await Promise.all([
        getDocs(query(collection(db, 'categories'), orderBy('label'))),
        getDocs(query(collection(db, 'family'), orderBy('label'))),
        getDocs(query(collection(db, 'menus'), orderBy('label'))),
        getDocs(query(collection(db, 'allergens'), orderBy('label'))),
      ])

      setCategories(
        categorySnap.docs.map(docSnap => ({
          id: docSnap.id,
          label: (docSnap.data().label as string) || docSnap.id,
        }))
      )
      setFamilies(
        familySnap.docs.map(docSnap => ({
          id: docSnap.id,
          label: (docSnap.data().label as string) || docSnap.id,
        }))
      )
      setMenusCatalog(
        menuSnap.docs.map(docSnap => ({
          id: docSnap.id,
          label: (docSnap.data().label as string) || docSnap.id,
        }))
      )

      const dbAllergens = allergenSnap.docs.map(docSnap => ({
        key: docSnap.id,
        label: (docSnap.data().label as string) || docSnap.id,
      }))

      if (dbAllergens.length) {
        dbAllergens.sort((a, b) => a.label.localeCompare(b.label))
        setAllergensCatalog(dbAllergens)
        setAllergensSource('db')
      } else {
        setAllergensCatalog(DEFAULT_ALLERGENS)
        setAllergensSource('default')
      }
    }

    loadOptions().catch(err => {
      console.error(err)
    })
  }, [])

  useEffect(() => {
    setExtraAllergens(prev => {
      const known = new Set(allergensCatalog.map(item => item.key))
      const next = prev.filter(item => !known.has(item.key))
      if (next.length === prev.length) return prev
      return next
    })
  }, [allergensCatalog])

  const handleChange = (key: keyof FormState, value: string | boolean) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleNameChange = (field: 'nameEs' | 'nameEn', value: string) => {
    const trimmed = value.trim()
    const metaKey = field === 'nameEs' ? 'es' : 'en'

    setForm(prev => {
      const nextMeta = { ...prev.nameMeta }
      if (trimmed) {
        nextMeta[metaKey] = { auto: false, reviewed: true }
      } else {
        delete nextMeta[metaKey]
      }

      return {
        ...prev,
        [field]: value,
        nameMeta: nextMeta,
      }
    })
  }

  const handleAllergenChange = (key: string, value: AllergenValue) => {
    setForm(prev => ({
      ...prev,
      allergens: {
        ...prev.allergens,
        [key]: value,
      },
    }))
  }

  const handleVeganToggle = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      vegan: checked,
      vegetarian: checked ? true : prev.vegetarian,
    }))
  }

  const requestTranslation = async (text: string, target: 'ES' | 'EN') => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, target }),
    })
    if (!res.ok) {
      throw new Error('Translation failed')
    }
    const data = await res.json()
    return (data?.text as string) || ''
  }

  const handleAutoTranslate = async () => {
    const source = form.nameCa.trim()
    if (!source) {
      setStatus('Cal indicar el nom en català.')
      return
    }

    setTranslating(true)
    setStatus('')

    try {
      const updates: Partial<FormState> = {}
      const metaUpdates: NameMeta = { ...form.nameMeta }

      if (!form.nameEs.trim()) {
        const translated = await requestTranslation(source, 'ES')
        if (translated) {
          updates.nameEs = translated
          metaUpdates.es = { auto: true, reviewed: false }
        }
      }

      if (!form.nameEn.trim()) {
        const translated = await requestTranslation(source, 'EN')
        if (translated) {
          updates.nameEn = translated
          metaUpdates.en = { auto: true, reviewed: false }
        }
      }

      if (Object.keys(updates).length) {
        setForm(prev => ({
          ...prev,
          ...updates,
          nameMeta: {
            ...prev.nameMeta,
            ...metaUpdates,
          },
        }))
      } else {
        setStatus('Les traduccions ja estan informades.')
      }
    } catch (err) {
      console.error(err)
      setStatus('Error en la traducció automàtica.')
    } finally {
      setTranslating(false)
    }
  }

  const seedDefaultAllergens = async () => {
    setLoading(true)
    setStatus('')
    try {
      await Promise.all(
        DEFAULT_ALLERGENS.map(allergen =>
          setDoc(
            doc(db, 'allergens', allergen.key),
            { label: allergen.label, updatedAt: serverTimestamp(), source: 'default' },
            { merge: true }
          )
        )
      )
      setAllergensCatalog(DEFAULT_ALLERGENS)
      setAllergensSource('db')
      setStatus('Al·lèrgens base guardats.')
    } catch (err) {
      console.error(err)
      setStatus('Error guardant els al·lèrgens base.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAllergen = async () => {
    const label = newAllergen.trim()
    if (!label) {
      setStatus('Cal indicar el nom de l’al·lèrgen.')
      return
    }

    const key = toAllergenKey(label)
    if (!key) {
      setStatus('No s’ha pogut generar la clau de l’al·lèrgen.')
      return
    }

    if (allergensCatalog.some(item => item.key === key)) {
      setStatus('Aquest al·lèrgen ja existeix.')
      return
    }

    setLoading(true)
    setStatus('')

    try {
      if (allergensSource === 'default') {
        await seedDefaultAllergens()
      }

      await setDoc(
        doc(db, 'allergens', key),
        { label, updatedAt: serverTimestamp(), source: 'manual' },
        { merge: true }
      )

      setAllergensCatalog(prev => [...prev, { key, label }])
      setExtraAllergens(prev => prev.filter(item => item.key !== key))
      setForm(prev => ({
        ...prev,
        allergens: {
          ...prev.allergens,
          [key]: '',
        },
      }))
      setNewAllergen('')
      setAllergensSource('db')
      setStatus('Al·lèrgen afegit.')
    } catch (err) {
      console.error(err)
      setStatus('Error afegint l’al·lèrgen.')
    } finally {
      setLoading(false)
    }
  }

  const removeAllergenFromPlats = async (key: string) => {
    const snap = await getDocs(collection(db, 'plats'))
    let batch = writeBatch(db)
    let batchCount = 0

    const commitBatch = async () => {
      if (batchCount === 0) return
      await batch.commit()
      batch = writeBatch(db)
      batchCount = 0
    }

    snap.forEach(docSnap => {
      const data = docSnap.data() as any
      if (!data?.allergens || !(key in data.allergens)) return
      batch.update(docSnap.ref, { [`allergens.${key}`]: deleteField() })
      batchCount++
      if (batchCount >= 450) {
        commitBatch().catch(err => console.error(err))
      }
    })

    await commitBatch()
  }

  const handleDeleteAllergen = async (item: AllergenItem) => {
    if (DEFAULT_ALLERGEN_KEYS.has(item.key)) {
      setStatus('Aquest al·lèrgen forma part dels 14 base.')
      return
    }

    const confirmed = window.confirm(
      `Eliminar l’al·lèrgen "${item.label}" del catàleg?`
    )
    if (!confirmed) return

    const alsoRemove = window.confirm(
      'Vols eliminar-lo també de tots els plats?'
    )

    setLoading(true)
    setStatus('')

    try {
      await deleteDoc(doc(db, 'allergens', item.key))

      setAllergensCatalog(prev => prev.filter(allergen => allergen.key !== item.key))
      setExtraAllergens(prev => prev.filter(allergen => allergen.key !== item.key))
      setForm(prev => {
        const nextAllergens = { ...prev.allergens }
        delete nextAllergens[item.key]
        return { ...prev, allergens: nextAllergens }
      })
      setOriginalAllergens(prev => {
        const next = { ...prev }
        delete next[item.key]
        return next
      })

      if (alsoRemove) {
        await removeAllergenFromPlats(item.key)
      }

      setStatus(
        alsoRemove
          ? 'Al·lèrgen eliminat del catàleg i dels plats.'
          : 'Al·lèrgen eliminat del catàleg.'
      )
    } catch (err) {
      console.error(err)
      setStatus('Error eliminant l’al·lèrgen.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMenu = (menuId: string) => {
    setForm(prev => {
      const exists = prev.menus.includes(menuId)
      const nextMenus = exists
        ? prev.menus.filter(item => item !== menuId)
        : [...prev.menus, menuId]
      return {
        ...prev,
        menus: nextMenus,
      }
    })
  }

  const handleLoad = async () => {
    if (!form.code.trim()) {
      setStatus('Cal indicar el codi per carregar.')
      return
    }

    setLoading(true)
    setStatus('')

    try {
      const snap = await getDoc(doc(db, 'plats', form.code.trim()))
      if (!snap.exists()) {
        setStatus('No s’ha trobat cap plat amb aquest codi.')
        return
      }

      const data = snap.data() as any
      const loadedMenus = Array.isArray(data.menus) && data.menus.length
        ? data.menus
        : parseMenus(data.onEstanRaw || '')

      const loadedAllergens = data.allergens || {}
      setOriginalAllergens(loadedAllergens)

      const known = new Set(allergensCatalog.map(item => item.key))
      const extra = Object.keys(loadedAllergens)
        .filter(key => !known.has(key))
        .map(key => ({ key, label: key }))
      setExtraAllergens(extra)

      setForm({
        code: data.code || form.code,
        nameCa: data.name?.ca || '',
        nameEs: data.name?.es || '',
        nameEn: data.name?.en || '',
        nameMeta: data.nameMeta || {},
        categoryId: data.category || '',
        familyId: data.family || '',
        menus: loadedMenus,
        menusRaw: data.onEstanRaw || '',
        vegan: Boolean(data.consumption?.vegan),
        vegetarian: Boolean(data.consumption?.vegetarian),
        allergens: buildAllergensState(loadedAllergens, [
          ...allergensCatalog,
          ...extra,
        ]),
      })
      setStatus('Plat carregat.')
    } catch (err) {
      console.error(err)
      setStatus('Error carregant el plat.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setForm(defaultFormState)
    setNewCategory('')
    setNewFamily('')
    setNewMenu('')
    setNewAllergen('')
    setOriginalAllergens({})
    setStatus('')
  }

  const handleDelete = async () => {
    const code = form.code.trim()
    if (!code) {
      setStatus('Cal indicar el codi per eliminar.')
      return
    }

    const confirmed = window.confirm(
      `Segur que vols eliminar el plat ${code}? Aquesta accio no es pot desfer.`
    )
    if (!confirmed) return

    setLoading(true)
    setStatus('')

    try {
      await deleteDoc(doc(db, 'plats', code))
      handleReset()
      setStatus('Plat eliminat.')
    } catch (err) {
      console.error(err)
      setStatus('Error eliminant el plat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!allergenItems.length) return
    setForm(prev => {
      const next = { ...prev.allergens }
      allergenItems.forEach(item => {
        if (!(item.key in next)) next[item.key] = ''
      })
      return {
        ...prev,
        allergens: next,
      }
    })
  }, [allergenItems])

  const handleSave = async () => {
    if (!form.code.trim() || !form.nameCa.trim()) {
      setStatus('El codi i el nom en català són obligatoris.')
      return
    }

    setLoading(true)
    setStatus('')

    const categoryLabel = newCategory.trim() || categories.find(c => c.id === form.categoryId)?.label || ''
    const familyLabel = newFamily.trim() || families.find(f => f.id === form.familyId)?.label || ''
    const categoryId = categoryLabel ? slugify(categoryLabel) : ''
    const familyId = familyLabel ? slugify(familyLabel) : ''
    const menuIds = Array.from(new Set(form.menus))
    const newMenuId = newMenu.trim() ? normalizeMenuId(newMenu) : ''
    const newMenuLabel = newMenu.trim() ? formatMenuLabel(newMenu) : ''

    if (newMenuId) {
      if (!menuIds.includes(newMenuId)) menuIds.push(newMenuId)
    }

    const allergensPayload = { ...originalAllergens }
    allergenItems.forEach(({ key }) => {
      allergensPayload[key] = form.allergens[key] ? form.allergens[key] : null
    })

    const payload = {
      code: form.code.trim(),
      name: {
        ca: form.nameCa.trim(),
        es: form.nameEs.trim() || null,
        en: form.nameEn.trim() || null,
      },
      nameMeta: form.nameMeta,
      category: categoryId || null,
      categoryLabel: categoryLabel || null,
      family: familyId || null,
      familyLabel: familyLabel || null,
      menus: menuIds,
      onEstanRaw: menuIds.length ? menuIds.join(' ') : form.menusRaw.trim() || null,
      allergens: allergensPayload,
      consumption: {
        vegan: Boolean(form.vegan),
        vegetarian: form.vegan ? true : Boolean(form.vegetarian),
      },
      updatedAt: serverTimestamp(),
    }

    try {
      const docRef = doc(db, 'plats', payload.code)
      await setDoc(docRef, payload, { merge: true })

      if (categoryId) {
        await setDoc(
          doc(db, 'categories', categoryId),
          { label: categoryLabel, updatedAt: serverTimestamp(), source: 'manual' },
          { merge: true }
        )
      }

      if (familyId) {
        await setDoc(
          doc(db, 'family', familyId),
          { label: familyLabel, updatedAt: serverTimestamp(), source: 'manual' },
          { merge: true }
        )
      }

      if (newMenuId) {
        await setDoc(
          doc(db, 'menus', newMenuId),
          { label: newMenuLabel || newMenuId, updatedAt: serverTimestamp(), source: 'manual' },
          { merge: true }
        )
      }

      if (newCategory.trim() && categoryId) {
        setCategories(prev =>
          prev.some(item => item.id === categoryId)
            ? prev
            : [...prev, { id: categoryId, label: categoryLabel }]
        )
        setForm(prev => ({ ...prev, categoryId }))
        setNewCategory('')
      }

      if (newFamily.trim() && familyId) {
        setFamilies(prev =>
          prev.some(item => item.id === familyId)
            ? prev
            : [...prev, { id: familyId, label: familyLabel }]
        )
        setForm(prev => ({ ...prev, familyId }))
        setNewFamily('')
      }

      if (newMenuId) {
        setMenusCatalog(prev =>
          prev.some(item => item.id === newMenuId)
            ? prev
            : [...prev, { id: newMenuId, label: newMenuLabel || newMenuId }]
        )
        setForm(prev => ({ ...prev, menus: menuIds }))
        setNewMenu('')
      }

      const savedCode = payload.code
      const savedNameCa = payload.name.ca
      const savedNameEs = payload.name.es || ''
      const savedNameEn = payload.name.en || ''
      const savedNameMeta = payload.nameMeta || {}

      setOriginalAllergens(allergensPayload)
      handleReset()
      setStatus('Plat guardat correctament.')

      if (!savedNameEs || !savedNameEn) {
        void (async () => {
          try {
            const updates: Record<string, any> = {}
            const metaUpdates: NameMeta = { ...savedNameMeta }

            if (!savedNameEs) {
              const translated = await requestTranslation(savedNameCa, 'ES')
              if (translated) {
                updates['name.es'] = translated
                metaUpdates.es = { auto: true, reviewed: false }
              }
            }

            if (!savedNameEn) {
              const translated = await requestTranslation(savedNameCa, 'EN')
              if (translated) {
                updates['name.en'] = translated
                metaUpdates.en = { auto: true, reviewed: false }
              }
            }

            if (Object.keys(updates).length) {
              updates.nameMeta = metaUpdates
              updates.updatedAt = serverTimestamp()
              await updateDoc(doc(db, 'plats', savedCode), updates)
            }
          } catch (err) {
            console.error(err)
          }
        })()
      }
    } catch (err) {
      console.error(err)
      setStatus('Error guardant el plat.')
    } finally {
      setLoading(false)
    }
  }

  if (!allowed) {
    return (
      <>
        <ModuleHeader />
        <div className="p-6 text-center text-sm text-gray-500">
          No tens permisos per editar plats.
        </div>
      </>
    )
  }

  return (
    <>
      <ModuleHeader subtitle="Alta i edició de plats per al·lèrgens i menús." />

      <section className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Dades bàsiques</h2>
            <Button
              variant="secondary"
              onClick={handleAutoTranslate}
              disabled={loading || translating || !form.nameCa.trim()}
            >
              Autotraduir
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Codi *</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.code}
                  onChange={e => handleChange('code', e.target.value)}
                  placeholder="C0530100001"
                />
                <Button variant="secondary" onClick={handleLoad} disabled={loading}>
                  Carrega
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Nom (CAT) *</label>
              <Input
                className="mt-1"
                value={form.nameCa}
                onChange={e => handleChange('nameCa', e.target.value)}
                placeholder="Nom del plat en català"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Nom (ESP)</label>
              <Input
                className="mt-1"
                value={form.nameEs}
                onChange={e => handleNameChange('nameEs', e.target.value)}
                placeholder="Nom del plat en castellà"
              />
              {form.nameMeta.es?.reviewed && (
                <p className="text-xs text-emerald-600 mt-1">Revisat</p>
              )}
              {!form.nameMeta.es?.reviewed && form.nameMeta.es?.auto && (
                <p className="text-xs text-amber-600 mt-1">Autogenerat</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Nom (ENG)</label>
              <Input
                className="mt-1"
                value={form.nameEn}
                onChange={e => handleNameChange('nameEn', e.target.value)}
                placeholder="Nom del plat en anglès"
              />
              {form.nameMeta.en?.reviewed && (
                <p className="text-xs text-emerald-600 mt-1">Revisat</p>
              )}
              {!form.nameMeta.en?.reviewed && form.nameMeta.en?.auto && (
                <p className="text-xs text-amber-600 mt-1">Autogenerat</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Classificació</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <Select
                value={form.categoryId || ''}
                onValueChange={value =>
                  handleChange('categoryId', value === EMPTY_SELECT ? '' : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT}>Sense categoria</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 mt-2">
                <Input
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Nova categoria"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Família</label>
              <Select
                value={form.familyId || ''}
                onValueChange={value =>
                  handleChange('familyId', value === EMPTY_SELECT ? '' : value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecciona família" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT}>Sense família</SelectItem>
                  {families.map(fam => (
                    <SelectItem key={fam.id} value={fam.id}>
                      {fam.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 mt-2">
                <Input
                  value={newFamily}
                  onChange={e => setNewFamily(e.target.value)}
                  placeholder="Nova família"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Menús</label>

              {menuItems.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {menuItems.map(menu => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => toggleMenu(menu.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                        form.menus.includes(menu.id)
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {menu.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2">
                  Encara no hi ha menús registrats.
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Input
                  value={newMenu}
                  onChange={e => setNewMenu(e.target.value)}
                  placeholder="Nou menu (C1, CH2, CELIAC)"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona els menús on apareix el plat.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Model de consum</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.vegan}
                onChange={e => handleVeganToggle(e.target.checked)}
              />
              Vegà (activa vegetarià)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.vegetarian}
                disabled={form.vegan}
                onChange={e => handleChange('vegetarian', e.target.checked)}
              />
              Vegetarià
            </label>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Al·lèrgens</h2>

          {allergensSource === 'default' && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Llista base carregada. Pots guardar-la a Firestore per poder editar-la.
              <button
                type="button"
                className="ml-2 underline"
                onClick={seedDefaultAllergens}
                disabled={loading}
              >
                Guardar al·lèrgens base
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allergenItems.map(allergen => (
              <div key={allergen.key}>
                <label className="text-sm font-medium text-slate-700">{allergen.label}</label>
                <Select
                  value={form.allergens[allergen.key] || EMPTY_SELECT}
                  onValueChange={value =>
                    handleAllergenChange(
                      allergen.key,
                      (value === EMPTY_SELECT ? '' : value) as AllergenValue
                    )
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALLERGEN_OPTIONS.map(option => (
                    <SelectItem key={option.label} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              value={newAllergen}
              onChange={e => setNewAllergen(e.target.value)}
              placeholder="Nou al·lèrgen"
            />
            <Button variant="secondary" onClick={handleAddAllergen} disabled={loading}>
              Afegir al·lèrgen
            </Button>
          </div>

          {customAllergens.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                Al·lèrgens personalitzats
              </p>
              <div className="flex flex-wrap gap-2">
                {customAllergens.map(item => (
                  <Button
                    key={item.key}
                    variant="destructive"
                    className="h-7 px-3 text-xs"
                    onClick={() => handleDeleteAllergen(item)}
                    disabled={loading}
                  >
                    Elimina {item.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <Button
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-300"
            onClick={handleSave}
            disabled={loading}
          >
            Guardar plat
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !form.code.trim()}
          >
            Eliminar plat
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            Neteja formulari
          </Button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </div>
      </section>
    </>
  )
}
