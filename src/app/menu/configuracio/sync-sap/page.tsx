//file: src/app/menu/configuracio/sync-sap/page.tsx
'use client'

import { useState } from 'react'
import { RoleGuard } from '@/lib/withRoleGuard'
import { Button } from '@/components/ui/button'

export default function SyncSAPPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/sync/sap', { method: 'POST' })
      const json = await res.json()
      setResult(json)
    } catch (err) {
      setResult({ ok: false, error: String(err) })
    }

    setLoading(false)
  }

  return (
    <RoleGuard allowedRoles={['admin', 'direccio']}>
      <section className="p-6 space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">Sincronització SAP</h1>
        <p className="text-sm text-gray-600">
          Aquest procés compara el fitxer d’oportunitats de SAP (SharePoint) amb la col·lecció
          <strong> stage_verd</strong> de Firestore i actualitza els codis dels esdeveniments.
        </p>

        <Button
          onClick={handleSync}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {loading ? 'Sincronitzant…' : 'Sincronitzar ara'}
        </Button>

        {result && (
          <pre className="text-xs bg-slate-950 text-slate-100 p-3 rounded-lg overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </section>
    </RoleGuard>
  )
}
