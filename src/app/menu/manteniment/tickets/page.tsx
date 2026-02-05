'use client'

import { RoleGuard } from '@/lib/withRoleGuard'
import ModuleHeader from '@/components/layout/ModuleHeader'
import FiltersBar from '@/components/layout/FiltersBar'
import TicketsList from './components/TicketsList'
import CreateTicketModal from './components/CreateTicketModal'
import AssignTicketModal from './components/AssignTicketModal'
import type { TicketPriority, TicketStatus } from './types'
import { useMaintenanceTickets } from './useMaintenanceTickets'

const STATUS_LABELS: Record<TicketStatus, string> = {
  nou: 'Nou',
  assignat: 'Assignat',
  en_curs: 'En curs',
  espera: 'Espera',
  resolut: 'Resolut',
  validat: 'Validat',
}

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  urgent: 'Urgent',
  alta: 'Alta',
  normal: 'Normal',
  baixa: 'Baixa',
}

const statusBadgeClasses: Record<TicketStatus, string> = {
  nou: 'bg-emerald-100 text-emerald-800',
  assignat: 'bg-blue-100 text-blue-800',
  en_curs: 'bg-amber-100 text-amber-800',
  espera: 'bg-slate-100 text-slate-700',
  resolut: 'bg-green-100 text-green-800',
  validat: 'bg-purple-100 text-purple-800',
}

const priorityBadgeClasses: Record<TicketPriority, string> = {
  urgent: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  normal: 'bg-slate-100 text-slate-700',
  baixa: 'bg-blue-100 text-blue-700',
}

const formatDateTime = (value?: number | string | null) => {
  if (!value) return ''
  const date =
    typeof value === 'string'
      ? new Date(value)
      : typeof value === 'number'
      ? new Date(value)
      : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
}

export default function MaintenanceTicketsPage() {
  const {
    role,
    department,
    userId,
    loading,
    error,
    filters,
    setFilters,
    locations,
    machines,
    showCreate,
    setShowCreate,
    createLocation,
    setCreateLocation,
    createMachine,
    setCreateMachine,
    locationQuery,
    setLocationQuery,
    machineQuery,
    setMachineQuery,
    showLocationList,
    setShowLocationList,
    showMachineList,
    setShowMachineList,
    createDescription,
    setCreateDescription,
    createPriority,
    setCreatePriority,
    createImagePreview,
    createBusy,
    imageError,
    selected,
    setSelected,
    assignBusy,
    assignDate,
    setAssignDate,
    assignStartTime,
    setAssignStartTime,
    assignDuration,
    setAssignDuration,
    workerCount,
    setWorkerCount,
    availableIds,
    availabilityLoading,
    showHistory,
    setShowHistory,
    detailsLocation,
    setDetailsLocation,
    detailsMachine,
    setDetailsMachine,
    detailsDescription,
    setDetailsDescription,
    detailsPriority,
    setDetailsPriority,
    maintenanceUsers,
    furgonetes,
    handleImageChange,
    handleCreateTicket,
    handleAssign,
    handleAssignVehicle,
    handleUpdateDetails,
    handleDelete,
    groupedTickets,
  } = useMaintenanceTickets()

  return (
    <RoleGuard allowedRoles={['admin', 'direccio', 'cap']}>
      <div className="space-y-5 px-4 pb-8">
        <ModuleHeader
          title="Manteniment"
          subtitle="Tickets de reparació i manteniment."
          actions={
            <button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-full"
              onClick={() => setShowCreate(true)}
            >
              + Nou ticket
            </button>
          }
        />

        <FiltersBar
          filters={filters}
          setFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          hiddenFilters={['location']}
          locations={locations}
          statusLabel="Estat"
          statusOptions={[
            { value: '__all__', label: 'Tots' },
            { value: 'nou', label: STATUS_LABELS.nou },
            { value: 'assignat', label: STATUS_LABELS.assignat },
            { value: 'en_curs', label: STATUS_LABELS.en_curs },
            { value: 'espera', label: STATUS_LABELS.espera },
            { value: 'resolut', label: STATUS_LABELS.resolut },
            { value: 'validat', label: STATUS_LABELS.validat },
          ]}
          priorityLabel="Importància"
          priorityOptions={[
            { value: '__all__', label: 'Totes' },
            { value: 'urgent', label: PRIORITY_LABELS.urgent },
            { value: 'alta', label: PRIORITY_LABELS.alta },
            { value: 'normal', label: PRIORITY_LABELS.normal },
            { value: 'baixa', label: PRIORITY_LABELS.baixa },
          ]}
        />

        {loading && <p className="text-sm text-gray-500">Carregant…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && groupedTickets.length === 0 && (
          <p className="text-sm text-gray-500">No hi ha tickets encara.</p>
        )}

        <TicketsList
          groupedTickets={groupedTickets}
          onSelect={(ticket) => setSelected(ticket)}
          onDelete={handleDelete}
          canDelete={(ticket) =>
            ticket.createdById === userId ||
            role === 'admin' ||
            (role === 'cap' && department === 'manteniment')
          }
          formatDateTime={formatDateTime}
          statusBadgeClasses={statusBadgeClasses}
          priorityBadgeClasses={priorityBadgeClasses}
          statusLabels={STATUS_LABELS}
          priorityLabels={PRIORITY_LABELS}
        />

        {showCreate && (
          <CreateTicketModal
            locations={locations}
            machines={machines}
            createPriority={createPriority}
            setCreatePriority={setCreatePriority}
            locationQuery={locationQuery}
            setLocationQuery={setLocationQuery}
            createLocation={createLocation}
            setCreateLocation={setCreateLocation}
            machineQuery={machineQuery}
            setMachineQuery={setMachineQuery}
            createMachine={createMachine}
            setCreateMachine={setCreateMachine}
            createDescription={createDescription}
            setCreateDescription={setCreateDescription}
            showLocationList={showLocationList}
            setShowLocationList={setShowLocationList}
            showMachineList={showMachineList}
            setShowMachineList={setShowMachineList}
            priorityLabels={PRIORITY_LABELS}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateTicket}
            createBusy={createBusy}
            onImageChange={handleImageChange}
            imageError={imageError}
            imagePreview={createImagePreview}
          />
        )}

        {selected && (
          <AssignTicketModal
            ticket={selected}
            assignBusy={assignBusy}
            assignDate={assignDate}
            setAssignDate={setAssignDate}
            assignStartTime={assignStartTime}
            setAssignStartTime={setAssignStartTime}
            assignDuration={assignDuration}
            setAssignDuration={setAssignDuration}
            workerCount={workerCount}
            setWorkerCount={setWorkerCount}
            maintenanceUsers={maintenanceUsers}
            availableIds={availableIds}
            availabilityLoading={availabilityLoading}
            furgonetes={furgonetes}
            locations={locations}
            machines={machines}
            detailsLocation={detailsLocation}
            setDetailsLocation={setDetailsLocation}
            detailsMachine={detailsMachine}
            setDetailsMachine={setDetailsMachine}
            detailsDescription={detailsDescription}
            setDetailsDescription={setDetailsDescription}
            detailsPriority={detailsPriority}
            setDetailsPriority={setDetailsPriority}
            onUpdateDetails={handleUpdateDetails}
            formatDateTime={formatDateTime}
            statusLabels={STATUS_LABELS}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            setSelected={setSelected}
            onAssign={handleAssign}
            onAssignVehicle={handleAssignVehicle}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </RoleGuard>
  )
}



