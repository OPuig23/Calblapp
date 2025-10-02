// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { getPersonnelReport } from '@/services/reports'
import { normalizeRole, type Role } from '@/lib/roles'

interface ReportQuery {
  type?: string | string[]
  department?: string | string[]
  role?: string | string[]
  from?: string | string[]
  to?: string | string[]
  event?: string | string[]
  responsible?: string | string[]
  businessLine?: string | string[]
}

function toStr(value: string | string[] | undefined): string {
  if (!value) return ''
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // --- 1) Sessió + autorització amb rol normalitzat ---
  const session: Session | null = await getSession({ req })
  const userRole: Role = normalizeRole(session?.user?.role ?? null)

  // Només Admin i Direcció poden accedir als informes (segons "La Bíblia")
  if (!session || !['admin', 'direccio'].includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const {
    type,
    department,
    role,
    from,
    to,
    event,
    responsible,
    businessLine,
  } = req.query as ReportQuery

  if (toStr(type) !== 'personnel') {
    return res.status(400).json({ error: 'Invalid report type' })
  }

  try {
    const report = await getPersonnelReport({
      department: toStr(department),
      role: toStr(role),
      from: toStr(from),
      to: toStr(to),
      event: toStr(event),
      responsible: toStr(responsible),
      businessLine: toStr(businessLine),
    })

    console.log('🔥 Report stats:', report.stats)
    return res.status(200).json(report)
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('❌ Error generating personnel report:', e)
      return res.status(500).json({ error: e.message })
    }
    console.error('❌ Unknown error generating personnel report:', e)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
