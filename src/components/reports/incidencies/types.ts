export type IncidentRow = {
  id: string
  eventId: string
  eventTitle: string
  eventCode: string
  department: string
  importance: string
  category: string
  status: string
  ln: string
  createdAt: string
  eventDate: string
}

export type IncidentSummary = {
  total: number
  open: number
  topCategory: { name: string; count: number } | null
  topEvent: { name: string; count: number } | null
}
