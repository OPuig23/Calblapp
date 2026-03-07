export type AuditSubmodule = 'templates' | 'valuation' | 'consultation'

export type AuditDepartment = 'comercial' | 'serveis' | 'cuina' | 'logistica' | 'deco'

export type AuditTemplateStatus = 'active' | 'draft'

export type AuditTemplatePreview = {
  id: string
  name: string
  department: AuditDepartment
  blocks: number
  updatedAt: string
  status: AuditTemplateStatus
  isVisible: boolean
}

export type AuditItemType = 'checklist' | 'rating' | 'photo'

export type AuditTemplateItem = {
  id: string
  label: string
  type: AuditItemType
}

export type AuditTemplateBlock = {
  id: string
  title: string
  weight: number
  items: AuditTemplateItem[]
}

export type AuditTemplateDetail = {
  id: string
  name: string
  department: AuditDepartment
  status: AuditTemplateStatus
  isVisible: boolean
  blocks: AuditTemplateBlock[]
  updatedAt: string
}
