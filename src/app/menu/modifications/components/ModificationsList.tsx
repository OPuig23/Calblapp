// file: src/app/menu/modifications/components/ModificationsList.tsx
'use client'

import React from 'react'
import { Modification } from '@/hooks/useModifications'
import { CalendarDays, User, Building2 } from 'lucide-react'

interface Props {
  modifications: Modification[]
}

export default function ModificationsList({ modifications }: Props) {
  if (!modifications || modifications.length === 0) {
    return (
      <p className="text-center py-10 text-gray-500">
        No hi ha registres de modificacions.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {modifications.map((m) => (
        <div
          key={m.id}
          className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
        >
          {/* 🔹 Títol de l’esdeveniment */}
          <div className="text-base font-semibold text-gray-900 mb-1">
            {m.eventTitle || '(Sense títol)'}
          </div>

          {/* 🔹 Dades principals */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4 text-purple-600" />
              {new Date(m.eventDate || '').toLocaleDateString('ca-ES')}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4 text-purple-600" />
              {m.department || '—'}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-4 h-4 text-purple-600" />
              {m.createdBy || '—'}
            </span>
          </div>

          {/* 🔹 Categoria i importància */}
          <div className="flex flex-wrap gap-2 mb-2 text-xs">
            {m.category?.label && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {m.category.id} – {m.category.label}
              </span>
            )}
            {m.importance && (
              <span
                className={`px-2 py-0.5 rounded-full font-medium border ${
                  m.importance === 'alta'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : m.importance === 'mitjana'
                    ? 'bg-orange-50 text-orange-700 border-orange-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                {m.importance}
              </span>
            )}
          </div>

          {/* 🔹 Descripció */}
          <div className="text-sm text-gray-700 mb-2">
            {m.description || '(Sense descripció)'}
          </div>

          {/* 🔹 Data de registre */}
          <div className="text-xs text-gray-400">
            Registrat el{' '}
            {new Date(m.createdAt || '').toLocaleString('ca-ES', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
