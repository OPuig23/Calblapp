"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Calendar,
  Users,
  MapPin,
  FilePlus2,
  FileText,
  UploadCloud,
  Hash,
} from "lucide-react"

export default function CreateEventModal({
  isOpen,
  onClose,
  defaultDate,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  defaultDate: Date
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    code: "",
    title: "",
    location: "",
    commercial: "",
    pax: "",
    service: "Coffee",
  })
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)])
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert("⚠️ El títol és obligatori")
      return
    }

    try {
      setSaving(true)
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: defaultDate,
          createdAt: Date.now(),
          createdBy: "unknown",
          documents: files.map((f) => f.name), // 🔹 Ara només és una llista de noms
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al desa")

      console.log("✅ Esdeveniment (calendar) creat amb ID:", data.id)

      // Reset form
      setForm({
        code: "",
        title: "",
        location: "",
        commercial: "",
        pax: "",
        service: "Coffee",
      })
      setFiles([])
      onSaved()
      onClose()
    } catch (err) {
      console.error("🔥 Error afegint esdeveniment (calendar):", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl shadow-lg p-4 space-y-4">
        <DialogTitle className="sr-only">Nou esdeveniment (Calendar)</DialogTitle>

        {/* Codi */}
        <div className="flex items-center gap-3">
          <Hash size={18} className="text-blue-500" />
          <Input
            placeholder="Codi (opcional, ex: CB2025-001)"
            name="code"
            value={form.code}
            onChange={handleChange}
          />
        </div>

        {/* Títol */}
        <Input
          placeholder="Afegeix un títol"
          name="title"
          value={form.title}
          onChange={handleChange}
          className="text-lg font-semibold border-0 focus:ring-0"
          required
        />

        {/* Data */}
        <div className="flex items-center gap-3 text-sm">
          <Calendar size={18} className="text-blue-500" />
          <span>{defaultDate.toDateString()}</span>
        </div>

        {/* Comercial */}
        <div className="flex items-center gap-3">
          <Users size={18} className="text-blue-500" />
          <Input
            placeholder="Comercial / Responsable"
            name="commercial"
            value={form.commercial}
            onChange={handleChange}
          />
        </div>

        {/* Ubicació */}
        <div className="flex items-center gap-3">
          <MapPin size={18} className="text-blue-500" />
          <Input
            placeholder="Ubicació"
            name="location"
            value={form.location}
            onChange={handleChange}
          />
        </div>

        {/* PAX */}
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-3">
          <label className="text-sm w-20">Servei</label>
          <select
            name="service"
            value={form.service}
            onChange={handleChange}
            className="flex-1 border rounded p-2"
          >
            <option value="Coffee">Coffee</option>
            <option value="Cal Blay 5">Cal Blay 5</option>
            <option value="Sopar">Sopar</option>
            <option value="Concurs de paella">Concurs de paella</option>
          </select>
        </div>

        {/* Adjuntar documents */}
        <div className="flex items-center gap-3">
          <FilePlus2 size={18} className="text-blue-500" />
          <div className="flex flex-col flex-1">
            <label className="cursor-pointer text-sm text-blue-600 hover:underline flex items-center gap-1">
              <UploadCloud size={16} /> Adjunta fitxer
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {files.length > 0 && (
              <ul className="text-xs mt-1 text-gray-600 list-disc list-inside">
                {files.map((f, i) => (
                  <li key={i}>{f.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Botons */}
        <div className="flex justify-between pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel·lar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? "Desant..." : "Desa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
