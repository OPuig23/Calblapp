// file: src/hooks/useUsers.ts
import { useState, useEffect } from 'react'

export type User = {
  id: string
  userId?: string
  name: string
  password: string
  role: string
  department: string
  departmentLower?: string
  email?: string
  phone?: string

  // Camps de Treballador
  available?: boolean
  isDriver?: boolean
  workerRank?: 'soldat' | 'responsable'
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users', { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) {
        console.error(`❌ fetchUsers failed ${res.status}:`, text)
        throw new Error(`Error fetching users: ${res.status}`)
      }
      const data = JSON.parse(text) as User[] | any
      const arr: User[] = Array.isArray(data) ? data : []
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setUsers(arr)
    } catch (err) {
      console.error('❌ fetchUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  async function saveUser(id: string | null, data: Omit<User, 'id'>) {
    const payload: Partial<User> = {
      name:       data.name,
      password:   data.password,
      role:       data.role,
      department: data.department,
      email:      data.email,
      phone:      data.phone,
      // si és Treballador, enviem extres
      available:  data.available,
      isDriver:   data.isDriver,
      workerRank: data.workerRank,
    }

    let res: Response
    if (id) {
      res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }

    const text = await res.text()
    if (!res.ok) {
      console.error(`❌ saveUser failed ${res.status}:`, text)
      throw new Error(`Error saving user (status ${res.status})`)
    }

    await fetchUsers()
  }

  async function deleteUser(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const text = await res.text()
      if (!res.ok) {
        console.error(`❌ deleteUser failed ${res.status}:`, text)
        throw new Error(`Error deleting user: ${res.status}`)
      }
      await fetchUsers()
    } catch (err) {
      console.error('❌ deleteUser error:', err)
      throw err
    }
  }

  // 👇 exposem fetchUsers com a funció pública
  return { users, loading, saveUser, deleteUser, fetchUsers }
}
