"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import {
  logisticPhaseOptions,
  LogisticPhaseKey,
  LogisticPhaseForm,
  LogisticPhaseSetting,
  VehicleAssignment,
  AvailableVehicle,
} from "../phaseConfig"
import PhaseCard from "./PhaseCard"

type Props = {
  phaseForms: Record<LogisticPhaseKey, LogisticPhaseForm>
  phaseSettings: Record<LogisticPhaseKey, LogisticPhaseSetting>
  phaseVisibility: Record<LogisticPhaseKey, boolean>
  phaseResponsibles: Record<LogisticPhaseKey, string>
  phaseVehicleAssignments: Record<LogisticPhaseKey, VehicleAssignment[]>
  availableVehicles: AvailableVehicle[]
  availableResponsables: Array<{ id: string; name: string }>
  togglePhaseVisibility: (key: LogisticPhaseKey) => void
  updatePhaseForm: (key: LogisticPhaseKey, patch: Partial<LogisticPhaseForm>) => void
  updatePhaseSetting: (key: LogisticPhaseKey, patch: Partial<LogisticPhaseSetting>) => void
  updatePhaseResponsible: (key: LogisticPhaseKey, value: string) => void
  updatePhaseVehicleAssignment: (key: LogisticPhaseKey, index: number, patch: Partial<VehicleAssignment>) => void
}

const normalizeVehicleType = (value?: string) => {
  const val = (value || '').toString().toLowerCase()
  if (!val) return ''
  if (val.includes('petit')) return 'camioPetit'
  if (val.includes('gran')) return 'camioGran'
  if (val.includes('furgo')) return 'furgoneta'
  return val
}

export default function LogisticsPhasePanel({
  phaseForms,
  phaseSettings,
  phaseVisibility,
  phaseResponsibles,
  phaseVehicleAssignments,
  availableVehicles,
  availableResponsables,
  togglePhaseVisibility,
  updatePhaseForm,
  updatePhaseSetting,
  updatePhaseResponsible,
  updatePhaseVehicleAssignment,
}: Props) {
  const assignedVehicleIds = new Set(
    Object.values(phaseVehicleAssignments)
      .flat()
      .map((assign) => assign.vehicleId)
      .filter(Boolean)
  )

  const availableVehicleCount = availableVehicles.filter((v) => v.available).length

  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-700">Fase logística</p>
      <div className="grid gap-3">
        {logisticPhaseOptions.map((phase) => {
          const form = phaseForms[phase.key]
          const settings = phaseSettings[phase.key]
          const visible = phaseVisibility[phase.key]
          const responsibleValue = phaseResponsibles[phase.key]
          const assignments = phaseVehicleAssignments[phase.key] ?? []
          const needsResponsible = (settings?.needsResponsible ?? phase.key === "event") && phase.key === "event"

          return (
            <PhaseCard
              key={phase.key}
              label={phase.label}
              description="Activar per generar aquesta fase"
              selected={settings?.selected ?? true}
              visible={visible}
              onToggleSelection={() =>
                updatePhaseSetting(phase.key, { selected: !(settings?.selected ?? true) })
              }
              onToggleVisibility={() => togglePhaseVisibility(phase.key)}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Data Inici</Label>
                  <Input
                    type="date"
                    value={form?.startDate || ""}
                    onChange={(e) => updatePhaseForm(phase.key, { startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={form?.endDate || ""}
                    onChange={(e) => updatePhaseForm(phase.key, { endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Hora Inici</Label>
                  <Input
                    type="time"
                    value={form?.startTime || ""}
                    onChange={(e) => updatePhaseForm(phase.key, { startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Hora Fi</Label>
                  <Input
                    type="time"
                    value={form?.endTime || ""}
                    onChange={(e) => updatePhaseForm(phase.key, { endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label># Treballadors</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form?.workers ?? ""}
                    onChange={(e) =>
                      updatePhaseForm(phase.key, {
                        workers: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label># Conductors</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form?.drivers ?? ""}
                    onChange={(e) =>
                      updatePhaseForm(phase.key, {
                        drivers: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Lloc de concentració</Label>
                <Input
                  type="text"
                  value={form?.meetingPoint || ""}
                  onChange={(e) => updatePhaseForm(phase.key, { meetingPoint: e.target.value })}
                />
              </div>

              {phase.key === "event" && needsResponsible && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`needs-resp-${phase.key}`}
                      checked={settings?.needsResponsible ?? true}
                      onCheckedChange={(checked) =>
                        updatePhaseSetting(phase.key, { needsResponsible: Boolean(checked) })
                      }
                    />
                    <Label htmlFor={`needs-resp-${phase.key}`} className="mb-0 text-sm">
                      Necessita responsable?
                    </Label>
                  </div>
                  {(settings?.needsResponsible ?? true) && (
                    <div>
                      <Label>Responsable</Label>
                      <Select
                        value={phaseResponsibles[phase.key]}
                        onValueChange={(value) => updatePhaseResponsible(phase.key, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un responsable…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__auto__">— Automàtic —</SelectItem>
                          {availableResponsables.map((resp) => (
                            <SelectItem key={resp.id} value={resp.id}>
                              {resp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {assignments.length > 0 && (
                <div className="space-y-3 mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-gray-500">
                    Vehicles disponibles (total): {availableVehicleCount} / {availableVehicles.length}
                  </div>
                  {assignments.map((assign, idx) => {
                    const filtered = availableVehicles.filter((vehicle) => {
                      if (!vehicle.available) return false
                      if (
                        normalizeVehicleType(vehicle.type) !== normalizeVehicleType(assign.vehicleType)
                      )
                        return false
                      if (assign.vehicleId && assign.vehicleId === vehicle.id) return true
                      return !assignedVehicleIds.has(vehicle.id)
                    })

                    return (
                      <div key={idx} className="border border-slate-200 rounded-xl bg-white p-3 space-y-2">
                        <p className="text-sm font-semibold">Vehicle #{idx + 1}</p>
                        <Select
                          value={assign.vehicleType}
                          onValueChange={(value) =>
                            updatePhaseVehicleAssignment(phase.key, idx, {
                              vehicleType: value,
                              vehicleId: "",
                              plate: "",
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Tipus de vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="camioPetit">Camió petit</SelectItem>
                            <SelectItem value="furgoneta">Furgoneta</SelectItem>
                            <SelectItem value="camioGran">Camió gran</SelectItem>
                          </SelectContent>
                        </Select>
                        {assign.vehicleType && (
                          <>
                            <div className="text-xs text-gray-500">
                              Matrícules disponibles: {filtered.length}
                            </div>
                            <Select
                              value={assign.vehicleId}
                              onValueChange={(value) => {
                                if (value === "__any__") {
                                  updatePhaseVehicleAssignment(phase.key, idx, {
                                    vehicleId: "",
                                    plate: "",
                                  })
                                  return
                                }
                                const chosen = availableVehicles.find((vehicle) => vehicle.id === value)
                                updatePhaseVehicleAssignment(phase.key, idx, {
                                  vehicleId: value,
                                  plate: chosen?.plate || "",
                                  vehicleType: normalizeVehicleType(chosen?.type),
                                })
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Tipus només o matrícula" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__any__">(Només tipus, sense matrícula)</SelectItem>
                                {filtered.map((vehicle) => (
                                  <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.plate || "(sense matrícula)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="space-y-1 pt-2">
                              <Label>Hora d’arribada</Label>
                              <Input
                                type="time"
                                value={assign.arrivalTime || ""}
                                onChange={(e) =>
                                  updatePhaseVehicleAssignment(phase.key, idx, {
                                    arrivalTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </PhaseCard>
          )
        })}
      </div>
    </div>
  )
}
