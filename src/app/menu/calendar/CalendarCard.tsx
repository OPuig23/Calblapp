// src/app/menu/calendar/CalendarCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EventProps = {
  event: {
    id: number
    code: string
    name: string
    location: string
    pax: number
    service: string
    commercial: string
  }
}

export default function CalendarCard({ event }: EventProps) {
  return (
    <Card className="rounded-2xl shadow-md hover:shadow-lg transition">
      <CardHeader>
        <CardTitle>{event.name}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <p><b>Codi:</b> {event.code}</p>
        <p><b>Ubicació:</b> {event.location}</p>
        <p><b>PAX:</b> {event.pax}</p>
        <p><b>Servei:</b> {event.service}</p>
        <p><b>Comercial:</b> {event.commercial}</p>
      </CardContent>
    </Card>
  )
}
