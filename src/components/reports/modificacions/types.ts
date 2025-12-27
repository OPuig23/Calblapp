export type ModificationRow = {
  id: string
  eventId: string
  eventTitle: string
  eventCode: string
  eventDate: string
  eventCommercial: string
  department: string
  importance: string
  category: string
  createdAt: string
  last72h: boolean
}

export type ModificationSummary = {
  total: number
  last72: number
  topCategory: { name: string; count: number } | null
  topCommercial: { name: string; count: number } | null
}
