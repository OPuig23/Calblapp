import type { Dispatch, SetStateAction } from 'react'
import type {
  MachineItem,
  Ticket,
  TicketPriority,
  TicketStatus,
  TransportItem,
  UserItem,
} from '../types'

type Props = {
  ticket: Ticket
  assignBusy: boolean
  assignDate: string
  setAssignDate: (value: string) => void
  assignStartTime: string
  setAssignStartTime: (value: string) => void
  assignDuration: string
  setAssignDuration: (value: string) => void
  workerCount: number
  setWorkerCount: (value: number) => void
  maintenanceUsers: UserItem[]
  availableIds: string[]
  availabilityLoading: boolean
  furgonetes: TransportItem[]
  locations: string[]
  machines: MachineItem[]
  detailsLocation: string
  setDetailsLocation: (value: string) => void
  detailsMachine: string
  setDetailsMachine: (value: string) => void
  detailsDescription: string
  setDetailsDescription: (value: string) => void
  detailsPriority: TicketPriority
  setDetailsPriority: (value: TicketPriority) => void
  onUpdateDetails: () => void
  formatDateTime: (value?: number | string | null) => string
  statusLabels: Record<TicketStatus, string>
  showHistory: boolean
  setShowHistory: (value: boolean | ((prev: boolean) => boolean)) => void
  setSelected: Dispatch<SetStateAction<Ticket | null>>
  onAssign: (ticket: Ticket, ids: string[], names: string[]) => void
  onAssignVehicle: (ticket: Ticket, needsVehicle: boolean, plate: string | null) => void
  onClose: () => void
}

export default function AssignTicketModal({
  ticket,
  assignBusy,
  assignDate,
  setAssignDate,
  assignStartTime,
  setAssignStartTime,
  assignDuration,
  setAssignDuration,
  workerCount,
  setWorkerCount,
  maintenanceUsers,
  availableIds,
  availabilityLoading,
  furgonetes,
  locations,
  machines,
  detailsLocation,
  setDetailsLocation,
  detailsMachine,
  setDetailsMachine,
  detailsDescription,
  setDetailsDescription,
  detailsPriority,
  setDetailsPriority,
  onUpdateDetails,
  formatDateTime,
  statusLabels,
  showHistory,
  setShowHistory,
  setSelected,
  onAssign,
  onAssignVehicle,
  onClose,
}: Props) {
  const eventTitleShort = (ticket.sourceEventTitle || '')
    .split('/')
    .map((chunk) => chunk.trim())
    .filter(Boolean)[0]

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-gray-900">{ticket.machine}</div>
            <div className="text-xs text-gray-500">
              {ticket.ticketCode || ticket.incidentNumber || 'TIC'} · {ticket.location}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onAssign(ticket, ticket.assignedToIds || [], ticket.assignedToNames || [])
              }
              disabled={assignBusy}
              className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px]"
            >
              {assignBusy ? 'Assignant…' : 'Assignar'}
            </button>
            <button onClick={onClose} className="text-gray-500">
              ✕
            </button>
          </div>
        </div>

        {(ticket.source === 'whatsblapp' || ticket.source === 'incidencia') &&
          ticket.status === 'nou' && (
          <div className="border rounded-xl p-3 space-y-3">
            <div className="text-xs font-semibold text-gray-600">Revisió del ticket</div>
            {(ticket.sourceEventTitle || ticket.sourceEventCode || ticket.sourceEventDate) && (
              <div className="rounded-lg bg-slate-50 border px-3 py-2 text-xs text-slate-600">
                <div className="font-semibold text-slate-700">
                  {eventTitleShort || ticket.sourceEventTitle || 'Esdeveniment'}
                </div>
                <div>
                  {(ticket.sourceEventCode || '').trim()}
                  {(ticket.sourceEventCode && ticket.sourceEventDate) ? ' · ' : ''}
                  {(ticket.sourceEventDate || '').trim()}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-500 mb-1">Ubicació</span>
                  <select
                    className="border rounded-lg px-3 py-1 text-xs h-9 bg-gray-50"
                    value={detailsLocation}
                    onChange={(e) => setDetailsLocation(e.target.value)}
                  >
                    <option value="">Selecciona ubicació</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-gray-500 mb-1">Maquinària</span>
                  <select
                    className="border rounded-lg px-3 py-1 text-xs h-9 bg-gray-50"
                    value={detailsMachine}
                    onChange={(e) => setDetailsMachine(e.target.value)}
                  >
                    <option value="">Selecciona maquinària</option>
                    {machines.map((m) => (
                      <option key={`${m.code}-${m.name}`} value={m.label}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Observacions</span>
                <textarea
                  className="border rounded-lg px-3 py-2 text-xs min-h-[70px] bg-gray-50"
                  value={detailsDescription}
                  onChange={(e) => setDetailsDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-500">Importància</span>
                {(['urgent', 'alta', 'normal', 'baixa'] as TicketPriority[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDetailsPriority(key)}
                    className={`px-3 py-1 rounded-full text-xs border font-semibold ${
                      detailsPriority === key
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-100 text-gray-800 border-gray-200'
                    }`}
                  >
                    {key === 'urgent'
                      ? 'Urgent'
                      : key === 'alta'
                      ? 'Alta'
                      : key === 'normal'
                      ? 'Normal'
                      : 'Baixa'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onUpdateDetails}
                  className="ml-auto px-3 py-1 rounded-full border text-xs"
                >
                  Guardar dades
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-1 gap-2">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Data</span>
                <input
                  type="date"
                  className="border rounded-lg px-3 py-1 text-xs h-9 bg-gray-50"
                  value={assignDate}
                  onChange={(e) => setAssignDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Hora</span>
                <input
                  type="time"
                  className="border rounded-lg px-3 py-1 text-xs h-9 bg-gray-50"
                  value={assignStartTime}
                  onChange={(e) => setAssignStartTime(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Hores estimades</span>
                <input
                  type="time"
                  step={60}
                  className="border rounded-lg px-3 py-1 text-xs h-9 bg-gray-50"
                  value={assignDuration}
                  onChange={(e) => setAssignDuration(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Treballadors</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className="border rounded-lg px-2 py-1 text-xs h-9 bg-gray-50"
                  value={workerCount}
                  onChange={(e) => setWorkerCount(Number(e.target.value || 1))}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-1">Furgoneta</span>
                <select
                  className="border rounded-lg px-2 py-1 text-xs h-9 bg-gray-50"
                  value={ticket.vehiclePlate || ''}
                  onChange={(e) => onAssignVehicle(ticket, !!e.target.value, e.target.value || null)}
                >
                  <option value="">Sense assignar</option>
                  {furgonetes.map((t) => (
                    <option key={t.id} value={t.plate}>
                      {t.plate}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {availabilityLoading && <span>Comprovant disponibilitat…</span>}
              {!availabilityLoading && assignDate && assignStartTime && (
                <span className="text-[11px] text-emerald-700">Només disponibles</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {maintenanceUsers.map((u) => {
                const checked = ticket.assignedToIds?.includes(u.id)
                const isAvailable = availableIds.length === 0 || availableIds.includes(u.id)
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 border rounded-full px-3 py-1 text-xs ${
                      checked ? 'bg-emerald-100 border-emerald-200' : 'bg-white'
                    } ${!isAvailable ? 'opacity-40' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked}
                      disabled={!isAvailable}
                      onChange={(e) => {
                        const nextIds = new Set(ticket.assignedToIds || [])
                        if (e.target.checked) {
                          if (nextIds.size >= workerCount) return
                          nextIds.add(u.id)
                        } else {
                          nextIds.delete(u.id)
                        }
                        const nextIdList = Array.from(nextIds)
                        const nextNames = maintenanceUsers
                          .filter((item) => nextIdList.includes(item.id))
                          .map((item) => item.name)
                        setSelected((prev) =>
                          prev
                            ? {
                                ...prev,
                                assignedToIds: nextIdList,
                                assignedToNames: nextNames,
                              }
                            : prev
                        )
                      }}
                    />
                    <span>{u.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {ticket.assignedAt && (
            <div className="text-xs text-gray-500">
              Assignat: {formatDateTime(ticket.assignedAt)} · {ticket.assignedByName || ''}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="text-xs text-gray-600 underline text-left"
        >
          Històric
        </button>
        {showHistory && (
          <div className="border rounded-xl p-3 space-y-1">
            {(ticket.statusHistory || []).map((item, index) => (
              <div key={index} className="text-xs text-gray-500">
                {statusLabels[item.status]} · {formatDateTime(item.at)} · {item.byName || ''}
              </div>
            ))}
            {(!ticket.statusHistory || ticket.statusHistory.length === 0) && (
              <div className="text-xs text-gray-400">Sense historial.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
