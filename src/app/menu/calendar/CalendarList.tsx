// src/app/menu/calendar/CalendarList.tsx
import CalendarCard from "./CalendarCard"

const mockEvents = [
  { id: 1, code: "#123", name: "Casament Anna & Marc", location: "Font de la Canya", pax: 120, service: "Sopar", commercial: "Jordi Sales" },
  { id: 2, code: "#456", name: "Empresa Tech", location: "Masia Blayet", pax: 80, service: "Coffee", commercial: "Laura Clients" },
]

export default function CalendarList() {
  return (
    <div className="grid gap-4">
      {mockEvents.map(ev => (
        <CalendarCard key={ev.id} event={ev} />
      ))}
    </div>
  )
}
