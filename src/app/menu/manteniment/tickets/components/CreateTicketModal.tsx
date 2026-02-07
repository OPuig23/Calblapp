import type { MachineItem, TicketPriority, TicketType } from '../types'

type Props = {
  locations: string[]
  machines: MachineItem[]
  createPriority: TicketPriority
  setCreatePriority: (value: TicketPriority) => void
  createTicketType: TicketType
  setCreateTicketType: (value: TicketType) => void
  locationQuery: string
  setLocationQuery: (value: string) => void
  createLocation: string
  setCreateLocation: (value: string) => void
  machineQuery: string
  setMachineQuery: (value: string) => void
  createMachine: string
  setCreateMachine: (value: string) => void
  createDescription: string
  setCreateDescription: (value: string) => void
  showLocationList: boolean
  setShowLocationList: (value: boolean) => void
  showMachineList: boolean
  setShowMachineList: (value: boolean) => void
  priorityLabels: Record<TicketPriority, string>
  ticketTypeLabels: Record<TicketType, string>
  showTicketTypeSelector?: boolean
  onClose: () => void
  onCreate: () => void
  createBusy: boolean
  onImageChange: (file: File | null) => void
  imageError: string | null
  imagePreview?: string | null
}

export default function CreateTicketModal({
  locations,
  machines,
  createPriority,
  setCreatePriority,
  createTicketType,
  setCreateTicketType,
  locationQuery,
  setLocationQuery,
  createLocation,
  setCreateLocation,
  machineQuery,
  setMachineQuery,
  createMachine,
  setCreateMachine,
  createDescription,
  setCreateDescription,
  showLocationList,
  setShowLocationList,
  showMachineList,
  setShowMachineList,
  priorityLabels,
  ticketTypeLabels,
  showTicketTypeSelector = true,
  onClose,
  onCreate,
  createBusy,
  onImageChange,
  imageError,
  imagePreview,
}: Props) {
  const isDeco = createTicketType === 'deco'
  const machineLabel = isDeco ? 'Material' : 'Maquinària'
  const machinePlaceholder = isDeco ? 'Cerca material...' : 'Cerca maquinària...'
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      onClick={() => {
        setShowLocationList(false)
        setShowMachineList(false)
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold">Nou ticket</h2>
            <div className="flex flex-wrap gap-2">
              {(['urgent', 'alta', 'normal', 'baixa'] as TicketPriority[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setCreatePriority(key)}
                  className={`px-3 py-1 rounded-full text-xs border font-semibold ${
                    createPriority === key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {priorityLabels[key]}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500">
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {showTicketTypeSelector && (
            <div className="flex items-center gap-2 flex-wrap">
              {(['maquinaria', 'deco'] as TicketType[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCreateTicketType(key)}
                  className={`px-3 py-1 rounded-full text-xs border font-semibold ${
                    createTicketType === key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {ticketTypeLabels[key]}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <input
                className="w-full border rounded-xl px-3 py-2 text-[13px] pr-8"
                placeholder="Cerca ubicació..."
                value={locationQuery}
                onFocus={() => setShowLocationList(true)}
                onChange={(e) => {
                  setLocationQuery(e.target.value)
                  setCreateLocation('')
                  setShowLocationList(true)
                }}
              />
              {locationQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocationQuery('')
                    setCreateLocation('')
                    setShowLocationList(false)
                  }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Esborrar"
                >
                  ✕
                </button>
              )}
              {showLocationList && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border bg-white shadow">
                  {locations
                    .filter((loc) =>
                      loc.toLowerCase().includes(locationQuery.toLowerCase())
                    )
                    .map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => {
                          setCreateLocation(loc)
                          setLocationQuery(loc)
                          setShowLocationList(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {loc}
                      </button>
                    ))}
                  {locations.filter((loc) =>
                    loc.toLowerCase().includes(locationQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Sense resultats</div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <input
                className="w-full border rounded-xl px-3 py-2 text-[13px] pr-8"
                placeholder={machinePlaceholder}
                value={machineQuery}
                onFocus={() => setShowMachineList(true)}
                onChange={(e) => {
                  setMachineQuery(e.target.value)
                  setCreateMachine('')
                  setShowMachineList(true)
                }}
              />
              {machineQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMachineQuery('')
                    setCreateMachine('')
                    setShowMachineList(false)
                  }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-sm"
                  aria-label="Esborrar"
                >
                  ✕
                </button>
              )}
              {showMachineList && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border bg-white shadow">
                  {machines
                    .filter((m) => m.label.toLowerCase().includes(machineQuery.toLowerCase()))
                    .map((m) => (
                      <button
                        key={m.code + m.name}
                        type="button"
                        onClick={() => {
                          setCreateMachine(m.label)
                          setMachineQuery(m.label)
                          setShowMachineList(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {m.label}
                      </button>
                    ))}
                  {machines.filter((m) =>
                    m.label.toLowerCase().includes(machineQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Sense resultats</div>
                  )}
                </div>
              )}
              {machines.length === 0 && !isDeco && (
                <div className="text-xs text-amber-600 mt-1">
                  No s’ha pogut carregar la maquinària.</div>
              )}
            </div>
          </div>

          <textarea
            className="w-full border rounded-xl px-3 py-2 text-sm min-h-[96px]"
            placeholder="Què s’ha d’arreglar?"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
          />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Adjuntar</label>
              <label className="px-3 py-1 rounded-full border text-xs cursor-pointer">
                📎 Fitxer
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onImageChange(e.target.files?.[0] || null)}
                />
              </label>
              <label className="px-3 py-1 rounded-full border text-xs cursor-pointer">
                📷 Foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onImageChange(e.target.files?.[0] || null)}
                />
              </label>
              {imageError && <span className="text-xs text-red-600">{imageError}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-full border text-sm">
                Cancel·la
              </button>
              <button
                onClick={onCreate}
                disabled={createBusy}
                className="px-4 py-2 rounded-full bg-emerald-600 text-white text-sm"
              >
                {createBusy ? 'Desant…' : 'Crear'}
              </button>
            </div>
          </div>

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Previsualització"
              className="w-full max-h-48 object-cover rounded-xl"
            />
          )}
        </div>
      </div>
    </div>
  )
}


