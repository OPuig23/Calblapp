'use client'

import React from 'react'
import { Member, Channel } from '../types'
import { initials } from '../utils'

type Props = {
  members: Member[]
  selectedChannel: Channel | null
  canEditResponsible: boolean
  updateResponsible: (userId: string) => void
  savingResponsible: boolean
  userRole: string
  selfMember: Member | null
  onToggleVisibility: () => void
}

export default function MembersPanel({
  members,
  selectedChannel,
  canEditResponsible,
  updateResponsible,
  savingResponsible,
  userRole,
  selfMember,
  onToggleVisibility,
}: Props) {
  if (!selectedChannel) return null

  return (
    <div className="border-b bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
          Membres del canal
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Responsable:{' '}
        <span className="font-semibold text-gray-700 dark:text-slate-200">
          {selectedChannel.responsibleUserName || 'No assignat'}
        </span>
      </div>
      {(userRole === 'admin' || userRole === 'direccio') && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs border rounded-full px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:border-slate-600 dark:hover:text-white"
            onClick={onToggleVisibility}
          >
            {selfMember?.hidden ? 'Fer-me visible' : 'Amagar-me'}
          </button>
        </div>
      )}
      <div className="mt-3 space-y-2">
        {members.map((m) => {
          const isResponsible = selectedChannel.responsibleUserId === m.userId
          return (
            <div
              key={m.userId}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-slate-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-xs font-semibold">
                  {initials(m.userName)}
                </div>
                <div className="text-sm text-gray-800 dark:text-slate-100">
                  {m.userName}
                </div>
              </div>
              {isResponsible ? (
                <span className="text-xs font-semibold text-emerald-700">
                  Responsable
                </span>
              ) : canEditResponsible ? (
                <button
                  type="button"
                  className="text-xs border rounded-full px-3 py-1 text-gray-600 hover:text-gray-800 dark:text-slate-300 dark:border-slate-600 dark:hover:text-white"
                  onClick={() => updateResponsible(m.userId)}
                  disabled={savingResponsible}
                >
                  Fer responsable
                </button>
              ) : null}
            </div>
          )
        })}
        {members.length === 0 && (
          <div className="text-xs text-gray-500 dark:text-slate-400">
            Sense membres.
          </div>
        )}
      </div>
    </div>
  )
}
