// src/context/QuadrantContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { TemplateRow, Assignment } from '@/services/shifts'
import { buildRawAssignments, confirmQuadrant as confirmService } from '@/services/shifts'

type Status = 'draft' | 'preview' | 'confirming' | 'confirmed'

interface QuadrantContextType {
  rows: TemplateRow[]
  setRows: (rows: TemplateRow[]) => void
  assignments: Assignment[]
  status: Status
  generatePreview: (department: string) => Promise<void>
  confirmQuadrant: (department: string) => Promise<void>
}

const QuadrantContext = createContext<QuadrantContextType | undefined>(undefined)

export function QuadrantProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [status, setStatus] = useState<Status>('draft')

  async function generatePreview(department: string) {
    setStatus('preview')
    try {
      const result = await buildRawAssignments(rows, department)
      setAssignments(result)
    } catch (e) {
      console.error('Error generant preview:', e)
      setStatus('draft')
    }
  }

  async function confirmQuadrant(department: string) {
    setStatus('confirming')
    try {
      await confirmService(rows, assignments, department)
      setStatus('confirmed')
    } catch (e) {
      console.error('Error confirmant quadrant:', e)
      setStatus('preview')
    }
  }

  return (
    <QuadrantContext.Provider
      value={{ rows, setRows, assignments, status, generatePreview, confirmQuadrant }}
    >
      {children}
    </QuadrantContext.Provider>
  )
}

export function useQuadrantContext() {
  const ctx = useContext(QuadrantContext)
  if (!ctx) throw new Error('useQuadrantContext must be inside QuadrantProvider')
  return ctx
}
