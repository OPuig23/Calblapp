// File: src/services/personnel.ts

export interface Personnel {
  id: string
  name: string
  role: string
  isDriver?: boolean
  available: boolean
}

/**
 * Fetch personnel from Firestore via Next.js API route
 * @param department - department name
 * @returns list of Personnel
 */
export async function fetchPersonnelByDepartment(department: string): Promise<Personnel[]> {
  const res = await fetch(
    `/api/personnel?department=${encodeURIComponent(department)}`,
    { method: 'GET', cache: 'no-store' }
  )
  if (!res.ok) {
    console.error('Error fetching personnel:', await res.text())
    return []
  }
  const data: Personnel[] = await res.json()
  return data
}

// Alias for backward compatibility
export const getPersonnelByDepartment = fetchPersonnelByDepartment
