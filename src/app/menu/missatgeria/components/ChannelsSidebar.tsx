'use client'

import React from 'react'
import { Search } from 'lucide-react'
import { Channel } from '../types'
import { eventDateLabel, initials, timeLabel } from '../utils'

type Props = {
  eventMode: boolean
  categoryFilter: 'finques' | 'restaurants' | 'events' | 'projects'
  setCategoryFilter: (value: 'finques' | 'restaurants' | 'events' | 'projects') => void
  channelQuery: string
  setChannelQuery: (value: string) => void
  filteredChannels: Channel[]
  selectedChannelId: string | null
  onOpenChannel: (id: string) => void
  activeEventUnread: number
  showArchivedEvents: boolean
  setShowArchivedEvents: (value: boolean) => void
  userRole: string
}

function ChannelsSidebar({
  eventMode,
  categoryFilter,
  setCategoryFilter,
  channelQuery,
  setChannelQuery,
  filteredChannels,
  selectedChannelId,
  onOpenChannel,
  activeEventUnread,
  showArchivedEvents,
  setShowArchivedEvents,
  userRole,
}: Props) {
  return (
    <aside className="lg:col-span-1 bg-white dark:bg-slate-900">
      <div className="p-3 space-y-3 border-b border-gray-100 lg:border-b lg:border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2 border rounded-lg px-2 py-1 dark:border-slate-700">
          <Search className="w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            className="w-full text-sm outline-none bg-transparent text-gray-800 dark:text-slate-100"
            placeholder="Cerca canal, projecte, finca, restaurant o event..."
            value={channelQuery}
            onChange={(e) => setChannelQuery(e.target.value)}
          />
        </div>
        {!eventMode && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'finques', label: 'Finques' },
              { key: 'restaurants', label: 'Restaurants' },
              { key: 'projects', label: 'Projectes' },
              { key: 'events', label: 'Events' },
            ].map((chip) => {
              const active = categoryFilter === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setCategoryFilter(chip.key as Props['categoryFilter'])}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    active
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-600 border-gray-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {chip.label}
                    {chip.key === 'events' && activeEventUnread > 0 ? (
                      <span className="text-[11px] bg-red-500 text-white rounded-full px-2 py-0.5">
                        {activeEventUnread}
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {!eventMode && categoryFilter === 'events' && userRole === 'admin' && (
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showArchivedEvents}
              onChange={(e) => setShowArchivedEvents(e.target.checked)}
            />
            Veure tots els xats
          </label>
        )}
        {!eventMode && categoryFilter === 'events' && userRole === 'admin' && showArchivedEvents && (
          <div className="flex items-center gap-2 border rounded-lg px-2 py-1 dark:border-slate-700">
            <Search className="w-4 h-4 text-gray-400 dark:text-slate-400" />
            <input
              className="w-full text-sm outline-none bg-transparent text-gray-800 dark:text-slate-100"
              placeholder="Cerca event per codi o nom..."
              value={channelQuery}
              onChange={(e) => setChannelQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      <ul className="max-h-[70vh] overflow-y-auto">
        {filteredChannels.map((channel) => (
          <li key={channel.id}>
            <button
              type="button"
              onClick={() => onOpenChannel(channel.id)}
              className={`w-full text-left px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 ${
                selectedChannelId === channel.id ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-100 flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(channel.roomName || channel.eventTitle || channel.location || channel.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                      {channel.source === 'events'
                        ? channel.eventTitle || channel.location || channel.name
                        : channel.source === 'projects'
                          ? channel.roomName || channel.location || channel.name
                          : channel.location}
                    </div>
                    {channel.unreadCount ? (
                      <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                        {channel.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  {channel.source === 'events' && (
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                      {[channel.eventCode, eventDateLabel(channel.eventStart || channel.eventEnd), channel.location]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {channel.source === 'projects' && (
                    <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                      {[channel.projectName, channel.roomKind === 'block' ? 'Sala automatica' : 'Sala manual']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between gap-2">
                    <span className="truncate">{channel.lastMessagePreview || 'Sense missatges'}</span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
                      {timeLabel(channel.lastMessageAt)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
        {filteredChannels.length === 0 && (
          <li className="p-4 text-sm text-gray-500 dark:text-slate-400">
            No tens canals subscrits.
          </li>
        )}
      </ul>
    </aside>
  )
}

export default React.memo(ChannelsSidebar)
