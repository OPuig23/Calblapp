// file: src/app/menu/calendar/EditEventModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { firestoreClient } from "@/lib/firebase"
import {
  MapPin,
  Users,
  FileText,
  Hash,
  UploadCloud,
  Paperclip,
} from "lucide-react"

interface EventData {
  id: string
  code?: string
  title?: string
  location?: string
  pax?: string
  commercial?: string
  service?: string
  documents?: string[]
}

export default function EditEventModal({
  isOpen,
  onClose,
  event,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  event: EventData | null
  onSaved: () => void
}) {

  const [form, setForm] = useState({
    code: "",
    title: "",
    location: "",
    pax: "",
    commercial: "",
    service: "Coffee",
    documents: [] as string[],
  })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 🔹 Quan canvii l’event seleccionat, actualitzem el formulari
  useEffect(() => {
    if (event) {
      setForm({
        code: event.code || "",
        title: event.title || "",
        location: event.location || "",
        pax: event.pax || "",
        commercial: event.commercial || "",
        service: event.service || "Coffee",
        documents: event.documents || [],
      })
      setFiles([])
    }
  }, [event])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)])
  }

 const handleSubmit = async () => {
  if (!form.title?.trim()) {
    alert("Has d'omplir el títol de l'esdeveniment")
    return
  }
  try {
    setSaving(true)

    const res = await fetch(`/api/calendar?id=${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code || null,
        title: form.title,
        location: form.location,
        pax: form.pax,
        commercial: form.commercial,
        service: form.service,
        documents: [
          ...(form.documents || []),
          ...files.map((f) => f.name),
        ],
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Error actualitzant esdeveniment")

    console.log("✅ Actualitzat:", data)
    onSaved()
    onClose()
  } catch (err) {
    console.error("🔥 Error al desar:", err)
  } finally {
    setSaving(false)
  }
}


  const handleDelete = async () => {
    if (!confirm("Segur que vols eliminar aquest esdeveniment?")) return
    try {
      setDeleting(true)
      await firestoreClient.collection("esdeveniments").doc(event.id).delete()
      onSaved()
      onClose()
    } catch (err) {
      console.error("🔥 Error eliminant esdeveniment:", err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-lg p-4 space-y-4">
        <DialogTitle>Edita esdeveniment</DialogTitle>

        {/* Codi */}
        <div className="flex items-center gap-2">
          <Hash size={18} className="text-blue-500" />
          <Input
            placeholder="Codi (ex: CB2025-001)"
            name="code"
            value={form.code}
            onChange={handleChange}
          />
        </div>

        {/* Títol */}
        <Input
          placeholder="Títol"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="text-lg font-semibold"
        />

        {/* Comercial */}
        <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-500" />
          <Input
            placeholder="Comercial"
            name="commercial"
            value={form.commercial}
            onChange={handleChange}
          />
        </div>

        {/* Ubicació */}
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" />
          <Input
            placeholder="Ubicació"
            name="location"
            value={form.location}
            onChange={handleChange}
          />
        </div>

        {/* PAX */}
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-500" />
          <Input
            placeholder="PAX"
            type="number"
            name="pax"
            value={form.pax}
            onChange={handleChange}
          />
        </div>

        {/* Servei */}
        <div>
          <label className="text-sm">Servei</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option value="Coffee">Coffee</option>
            <option value="Cal Blay 5">Cal Blay 5</option>
            <option value="Sopar">Sopar</option>
            <option value="Concurs de paella">Concurs de paella</option>
          </select>
        </div>

        {/* Fitxers existents */}
        {form.documents && form.documents.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Paperclip size={16} className="text-gray-500" />
              Fitxers adjunts:
            </div>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {form.documents.map((doc: string, i: number) => (
                <li key={i}>
                  <a href="#" className="text-blue-600 hover:underline">
                    {doc}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Adjuntar nous fitxers */}
        <div className="flex items-center gap-2">
          <UploadCloud size={18} className="text-blue-500" />
          <label className="cursor-pointer text-sm text-blue-600 hover:underline flex items-center gap-1">
            Adjunta fitxer
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
        {files.length > 0 && (
          <ul className="text-xs mt-1 text-gray-600 list-disc list-inside">
            {files.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
        )}

        {/* Botons */}
        <div className="flex justify-between pt-3 border-t">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Eliminant..." : "Eliminar"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel·lar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 text-white"
              disabled={saving}
            >
              {saving ? "Desant..." : "Desa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
