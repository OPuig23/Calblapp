// file: src/app/menu/configuracio/page.tsx
'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Sun, Moon, Languages, Bell, LogOut } from 'lucide-react'

// 👉 ARA FEM SERVIR EL SISTEMA WEBPUSH
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function ConfiguracioPage() {
  const { data: session, status } = useSession()
  const {
    permission,
    error: pushError,
    subscribeUser,
    requestPermission,
  } = usePushNotifications()

  const user = session?.user as {
    id: string
    name?: string
  }

  const [hasDevicePush, setHasDevicePush] = useState<boolean>(false)
  const [loadingPush, setLoadingPush] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean>(false)

  // ──────────────────────────────────────────────────────────────
  // 1) Carregar estat inicial del dispositiu
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    const key = `cb_push_activated_${user.id}`
    setHasDevicePush(localStorage.getItem(key) === '1')

    const dark = localStorage.getItem('cb_dark_mode') === '1'
    setDarkMode(dark)
    if (dark) document.documentElement.classList.add('dark')
  }, [user?.id])

  if (status === 'loading') return <p className="p-4">Carregant…</p>
  if (!user) return <p className="p-4">No autoritzat.</p>

  // ──────────────────────────────────────────────────────────────
  // 2) Funcions push (WebPush)
  // ──────────────────────────────────────────────────────────────
  const enablePush = async () => {
    if (!user?.id) return
    try {
      setLoadingPush(true)

      // 2.1 Demanem permís al navegador
      const perm = await requestPermission()
      if (perm !== 'granted') {
        console.warn('[CalBlay] Permís notificacions no concedit:', perm)
        return
      }

      // 2.2 Creem subscripció WebPush i la guardem a Firestore
      const ok = await subscribeUser(user.id)
      if (!ok) return

      // 2.3 Marquem al dispositiu que ja està activat
      localStorage.setItem(`cb_push_activated_${user.id}`, '1')
      setHasDevicePush(true)
    } finally {
      setLoadingPush(false)
    }
  }

  const disablePush = () => {
    if (!user?.id) return
    // (Opcional: aquí podríem afegir /api/push/unsubscribe en el futur)
    localStorage.removeItem(`cb_push_activated_${user.id}`)
    setHasDevicePush(false)
  }

  // ──────────────────────────────────────────────────────────────
  // 3) Mode fosc / clar
  // ──────────────────────────────────────────────────────────────
  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val)
    localStorage.setItem('cb_dark_mode', val ? '1' : '0')

    if (val) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  // ──────────────────────────────────────────────────────────────
  // 4) UI
  // ──────────────────────────────────────────────────────────────
  return (
    <section className="w-full max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center mb-4">Configuració</h1>

      {/* ────────────── Targeta Notificacions ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-500" />
          <h2 className="font-semibold text-lg">Notificacions Push</h2>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="push-switch">Rebre notificacions</Label>
          <Switch
            id="push-switch"
            checked={hasDevicePush}
            disabled={loadingPush}
            onCheckedChange={(val) => {
              if (loadingPush) return
              if (val) void enablePush()
              else disablePush()
            }}
          />
        </div>

        {loadingPush && (
          <p className="text-sm text-blue-600">Activant…</p>
        )}

        {pushError && (
          <p className="text-xs text-red-600">
            Error notificacions: {pushError}
          </p>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-amber-600">
            Has bloquejat les notificacions al navegador. Caldrà activar-les als ajustos de Chrome.
          </p>
        )}
      </motion.div>

      {/* ────────────── Targeta Aparença ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 space-y-3"
      >
        <div className="flex items-center gap-2">
          {darkMode ? (
            <Moon className="w-5 h-5 text-yellow-500" />
          ) : (
            <Sun className="w-5 h-5 text-orange-500" />
          )}
          <h2 className="font-semibold text-lg">Aparença</h2>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="dark-switch">Mode fosc</Label>
          <Switch
            id="dark-switch"
            checked={darkMode}
            onCheckedChange={toggleDarkMode}
          />
        </div>
      </motion.div>

      {/* ────────────── Targeta Idioma ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-green-500" />
          <h2 className="font-semibold text-lg">Idioma</h2>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Properament: escollir català / castellà / anglès
        </p>
      </motion.div>

      {/* ────────────── Targeta Compte ────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 space-y-4"
      >
        <h2 className="font-semibold text-lg">Compte</h2>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 text-red-600 font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Tancar sessió
        </button>
      </motion.div>
    </section>
  )
}
