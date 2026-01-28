export type ConceptNode = { name: string; articles: string[] }

export type ServiceNode = {
  name: string
  templates: Array<{ name: string; concepts: ConceptNode[] }>
}

export type EventItem = {
  id: string
  name: string
  summary: string
  start: string
  end: string
  location: string
  pax: number
  commercial: string
  servei?: string
  horaInici?: string
  eventCode: string
}

export type OrderLine = {
  id: string
  service: string
  template: string
  concept: string
  qty: number
}

export type OrderState = {
  pax: number
  lines: OrderLine[]
}
