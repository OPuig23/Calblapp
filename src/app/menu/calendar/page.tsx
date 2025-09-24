// src/app/menu/calendar/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar.css"

import CreateEventModal from "./CreateEventModal"
import EditEventModal from "./EditEventModal"   // 👈 Afegim el modal d'edició

// 📅 Config localització (Català/Espanyol)
const locales = {
  ca: require("date-fns/locale/ca"),
  es: require("date-fns/locale/es"),
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

export default function CalendarPage() {
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null)
  const [events, setEvents] = useState<any[]>([])

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar")
      if (!res.ok) throw new Error("Error carregant esdeveniments")
      const data = await res.json()

      if (data.success && Array.isArray(data.data)) {
        const formatted = data.data.map((ev: any) => {
          let eventDate
          if (ev.date?._seconds) {
            eventDate = new Date(ev.date._seconds * 1000)
          } else {
            eventDate = new Date(ev.date)
          }
          return {
            id: ev.id,
             code: ev.code || "",
            title: ev.title || "(Sense títol)",
            start: eventDate,
            end: eventDate,
            location: ev.location || "",
            pax: ev.pax || "",
            service: ev.service || "",
            commercial: ev.commercial || "",
          }
        })
        setEvents(formatted)
      } else {
        setEvents([])
      }
    } catch (err) {
      console.error("🔥 Error carregant esdeveniments:", err)
      setEvents([])
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return (
    <section className="p-4">
      <h1 className="text-xl font-bold mb-4">📅 Calendar</h1>

      <div className="h-[80vh] bg-white rounded-xl shadow p-2">
        <BigCalendar
  selectable
  localizer={localizer}
  events={events}
  startAccessor="start"
  endAccessor="end"
  style={{ height: "100%" }}
  onSelectSlot={(slotInfo) => {
  setSelectedDate(slotInfo.start as Date)
  setOpenCreate(true)   // 👈 correcte, modal de creació
}}

  onSelectEvent={(event) => {
  setSelectedEvent(event)
  setOpenEdit(true)
}}

  eventPropGetter={(event) => {
    let bg = "#2563eb" // blau per defecte

    if (event.code?.startsWith("C")) bg = "#dc2626" // vermell si comença amb C
    if (event.code?.startsWith("E")) bg = "#16a34a" // verd si comença amb E
    if (event.code?.startsWith("F")) bg = "#9333ea" // lila si comença amb F

    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        padding: "2px 4px",
        color: "white",
        border: "none",
        marginBottom: "4px", // 🔹 separació entre events
      },
    }
  }}
/>

      </div>

      {/* Modal de creació */}
      {selectedDate && (
        <CreateEventModal
          isOpen={openCreate}
          onClose={() => setOpenCreate(false)}
          defaultDate={selectedDate}
          onSaved={fetchEvents}
        />
      )}

      {/* Modal d’edició */}
      {selectedEvent && (
        <EditEventModal
          isOpen={openEdit}
          onClose={() => setOpenEdit(false)}
          event={selectedEvent}
          onSaved={fetchEvents}
        />
      )}
    </section>
  )
}
