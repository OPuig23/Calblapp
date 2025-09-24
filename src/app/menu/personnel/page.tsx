// File: src/app/menu/personnel/page.tsx
import { redirect } from 'next/navigation'

export default function PersonnelPage() {
  // 🔹 Redirigim sempre a la llista de personal
  redirect('/menu/personnel/list')
}
