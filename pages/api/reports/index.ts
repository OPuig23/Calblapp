// pages/api/reports/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { getPersonnelReport } from '@/services/reports'
import { normalizeRole, type Role } from '@/lib/roles'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // --- 1) Sessió + autorització amb rol normalitzat ---
  const session = await getSession({ req })
  const userRole: Role = normalizeRole((session as any)?.user?.role)

  // Només Admin i Direcció poden accedir als informes (segons "La Bíblia")
  if (!session || !['admin', 'direccio'].includes(userRole)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const {
    type,
    department = '',
    role = '',
    from = '',
    to = '',
    event = '',
    responsible = '',
    businessLine = ''
  } = req.query

  if (type !== 'personnel') {
    return res.status(400).json({ error: 'Invalid report type' })
  }

  try {
    const report = await getPersonnelReport({
      department:    String(department),
      role:          String(role),
      from:          String(from),
      to:            String(to),
      event:         String(event),
      responsible:   String(responsible),
      businessLine:  String(businessLine)
    })
    console.log('🔥 Report stats:', report.stats)
    return res.status(200).json(report)
  } catch (e: any) {
    console.error('❌ Error generating personnel report:', e)
    return res.status(500).json({ error: e.message })
  }
}
