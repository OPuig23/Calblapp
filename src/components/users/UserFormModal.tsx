// file: src/components/users/UserFormModal.tsx
'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

export interface User {
  id?: string
  personId?: string
  name?: string
  role?: string
  department?: string
  available?: boolean
  driver?: { isDriver?: boolean }
  workerRank?: string
  phone?: string
  email?: string
  password?: string
}

export interface NewUserPayload {
  name: string
  password: string
  role: string
  department: string
  available?: boolean
  isDriver?: boolean
  workerRank?: string
  phone?: string
  email?: string
}

type Props = {
  user: User | null
  onSubmit: (data: User | NewUserPayload) => void
  onClose: () => void
  onAfterAction?: () => void
}

const ROLES = ['Admin', 'Direcció', 'Cap Departament', 'Treballador', 'Usuari', 'Comercial'] as const
const DEPARTS = [
  'Total',
  'Empresa',
  'Compres',
  'Comptabilitat',
  'Restauracio',
  'Marqueting',
  'Manteniment',
  'Plats Preparats',
  'Recursos Humans',
  'Serveis',
  'Logistica',
  'Cuina',
  'Food Lover',
  'Qualitat',
  'Producció',
  'Casaments',
  'Transports',
] as const

const RANKS = [
  { value: 'equip', label: 'Equip' },
  { value: 'responsable', label: 'Responsable' },
] as const

export function UserFormModal({ user, onSubmit, onClose, onAfterAction }: Props) {
  const [loading, setLoading] = React.useState(false)

  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState<string>('Treballador')
  const [department, setDepartment] = React.useState<string>('Total')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [available, setAvailable] = React.useState(true)
  const [isDriver, setIsDriver] = React.useState(false)
  const [workerRank, setWorkerRank] = React.useState<string>('equip')

  const isWorker =
    role?.toLowerCase().trim() === 'treballador' ||
    role?.toLowerCase().trim() === 'cap departament'

  React.useEffect(() => {
    let active = true

    async function loadRequest(personId: string) {
      setLoading(true)
      try {
        const res = await fetch(`/api/user-requests/${personId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Error carregant sol·licitud')

        if (!active) return
        setName(data.name ?? '')
        setRole(data.role ?? 'Treballador')
        setDepartment(data.department ?? data.departmentLower ?? 'Total')
        setPhone(data.phone ?? '')
        setEmail(data.email ?? '')
        setAvailable(data.available ?? true)
        setIsDriver(Boolean(data.driver?.isDriver))
        setWorkerRank(data.workerRank ?? 'equip')
        setPassword(Math.random().toString(36).slice(-8))
      } catch (err) {
        console.error('Error carregant sol·licitud:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (user?.personId) {
      loadRequest(user.personId)
      return () => {
        active = false
      }
    }

    if (!user?.id) return

    setName(user.name ?? '')
    setRole(user.role ?? 'Treballador')
    setDepartment(user.department ?? 'Total')
    setPhone(user.phone ?? '')
    setEmail(user.email ?? '')
    if (user.role?.toLowerCase() === 'treballador') {
      setAvailable(user.available ?? true)
      setIsDriver(user.driver?.isDriver ?? false)
      setWorkerRank(user.workerRank ?? 'equip')
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Aprovar sol·licitud
    if (user?.personId) {
      try {
        const res = await fetch(`/api/user-requests/${user.personId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()
        if (!res.ok) {
          const msg = (data && (data as any).error) || "No s'ha pogut aprovar la sol·licitud"
          alert(msg)
          return
        }
        onSubmit((data as any).user || { id: user.personId })
        onAfterAction?.()
        } catch (err) {
        console.error('Error cridant approve:', err)
      }
      return
    }

    // Edició
    if (user?.id) {
      const payload: User = {
        ...user,
        name,
        role,
        department,
        phone,
        email,
        available,
        isDriver,
        workerRank,
      }
      if (password.trim()) payload.password = password.trim()
      onSubmit(payload)
      return
    }

    // Creació
    const payload: NewUserPayload = {
      name,
      password,
      role,
      department,
      phone,
      email,
    }
    if (isWorker) {
      payload.available = available
      payload.isDriver = isDriver
      payload.workerRank = workerRank
    }
    onSubmit(payload)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{user?.id ? 'Editar Usuari' : 'Nou Usuari'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center text-gray-500">Carregant dades…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom complet</Label>
              <input
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Contrasenya {user?.id ? '(opcional)' : ''}</Label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={!user?.id}
                placeholder={user?.id ? 'Deixa buit per no canviar-la' : ''}
              />
            </div>

            <div>
              <Label>Nivell</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Departament</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={department}
                onChange={e => setDepartment(e.target.value)}
              >
                {DEPARTS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Telèfon</Label>
              <input
                type="tel"
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="600123123"
              />
            </div>

            <div>
              <Label>Email</Label>
              <input
                type="email"
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuari@exemple.com"
              />
            </div>

            <div
              className={cn(
                'rounded-xl border p-3 transition',
                isWorker ? 'opacity-100' : 'opacity-40 pointer-events-none'
              )}
            >
              <div className="mb-2 text-xs font-semibold text-gray-500">
                Paràmetres de Treballador
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Disponible</Label>
                  <div className="text-xs text-gray-500">Pot ser assignat a torns</div>
                </div>
                <Switch checked={available} onCheckedChange={setAvailable} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label className="text-sm">Conductor</Label>
                  <div className="text-xs text-gray-500">Pot fer de conductor</div>
                </div>
                <Switch checked={isDriver} onCheckedChange={setIsDriver} />
              </div>

              <div className="py-2">
                <Label>Categoria</Label>
                <select
                  className="mt-1 w-full rounded-md border p-2 text-sm"
                  value={workerRank}
                  onChange={e => setWorkerRank(e.target.value)}
                >
                  {RANKS.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-2 border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
                onClick={onClose}
              >
                Cancel·la
              </Button>

              <Button
                type="submit"
                className={cn(
                  'rounded-xl px-6 py-2 font-semibold text-white shadow-md',
                  user?.id
                    ? 'bg-emerald-400 hover:bg-emerald-500'
                    : 'bg-indigo-400 hover:bg-indigo-500'
                )}
              >
                {user?.id ? 'Desar Canvis' : 'Crear Usuari'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default UserFormModal
