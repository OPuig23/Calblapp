// src/app/menu/calendar/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar"
import format from "date-fns/format"
import parse from "date-fns/parse"
import startOfWeek from "date-fns/startOfWeek"
import getDay from "date-fns/getDay"
import ca from "date-fns/locale/ca"
import es from "date-fns/locale/es"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar.css"

import CreateEventModal from "./CreateEventModal"
import EditEventModal from "./EditEventModal"

const locales = { ca, es }

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  code: string
  title: string
  start: Date
  end: Date
  location: string
  pax: string
  service: string
  commercial: string
}

// Tipus de dades rebudes des de l’API (Firestore/JSON cru)
interface RawCalendarEvent {
  id: string
  code?: string
  title?: string
  date?: string | { _seconds: number }
  location?: string
  pax?: string | number
  service?: string
  commercial?: string
}

export default function CalendarPage() {
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar")
      if (!res.ok) throw new Error("Error carregant esdeveniments")
      const data = await res.json()

      if (data.success && Array.isArray(data.data)) {
        const formatted: CalendarEvent[] = data.data.map((ev: RawCalendarEvent) => {
          let eventDate: Date
          if (typeof ev.date === "object" && "_seconds" in ev.date) {
            eventDate = new Date(ev.date._seconds * 1000)
          } else {
            eventDate = new Date(ev.date as string)
          }

          return {
            id: String(ev.id),
            code: String(ev.code ?? ""),
            title: String(ev.title ?? "(Sense títol)"),
            start: eventDate,
            end: eventDate,
            location: String(ev.location ?? ""),
            pax: String(ev.pax ?? ""),
            service: String(ev.service ?? ""),
            commercial: String(ev.commercial ?? ""),
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
            setOpenCreate(true)
          }}
          onSelectEvent={(event) => {
            setSelectedEvent(event as CalendarEvent)
            setOpenEdit(true)
          }}
          eventPropGetter={(event) => {
            let bg = "#2563eb" // blau per defecte

            if (event.code?.startsWith("C")) bg = "#dc2626" // vermell
            if (event.code?.startsWith("E")) bg = "#16a34a" // verd
            if (event.code?.startsWith("F")) bg = "#9333ea" // lila

            return {
              style: {
                backgroundColor: bg,
                borderRadius: "6px",
                padding: "2px 4px",
                color: "white",
                border: "none",
                marginBottom: "4px",
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
