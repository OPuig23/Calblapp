// file: src/app/menu/configuracio/page.tsx
'use client'

import Link from 'next/link'
import { Upload, Settings } from 'lucide-react'
import { RoleGuard } from '@/lib/withRoleGuard'

export default function ConfiguracioPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'direccio']}>
      <section className="relative w-full max-w-3xl mx-auto p-6 space-y-8">
        {/* 🧭 Títol */}
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-semibold text-gray-800">
            Configuració del sistema
          </h1>
        </div>

        <p className="text-sm text-gray-600">
          Aquí pots gestionar les opcions generals de l’aplicació i executar processos interns com la sincronització amb SAP o altres sistemes.
        </p>

        {/* ⚙️ Llista de configuracions disponibles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/menu/configuracio/sync-sap"
            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm transition-all hover:shadow-md"
          >
            <Upload className="w-8 h-8 mb-2 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-800">
              Sincronització SAP
            </h2>
            <p className="text-sm text-gray-500">
              Compara el fitxer d’oportunitats (SharePoint) amb Firestore.
            </p>
          </Link>

          {/* 🔜 Futurs apartats */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center opacity-70">
            <Settings className="w-8 h-8 mb-2 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-500">
              Paràmetres generals
            </h2>
            <p className="text-sm text-gray-400">
              Configuracions d’usuaris, permisos i altres opcions.
            </p>
          </div>
        </div>
      </section>
    </RoleGuard>
  )
}
