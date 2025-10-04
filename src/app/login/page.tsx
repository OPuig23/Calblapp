// File: src/app/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState, Suspense } from 'react'

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl: string = searchParams?.get('callbackUrl') ?? '/menu'

  const [user, setUser] = useState<string>('')
  const [pass, setPass] = useState<string>('')
  const [remember, setRemember] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill username if previously remembered
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cb_login_username') : null
    if (saved) {
      setUser(saved)
      setRemember(true)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await signIn('credentials', {
      redirect: false,
      username: user,
      password: pass,
      // callbackUrl is handled via router.push for explicit control
    })

    if (res?.error) {
      setLoading(false)
      setError('Usuari o contrasenya incorrectes')
      return
    }

    // Remember username (never password)
    try {
      if (remember) localStorage.setItem('cb_login_username', user)
      else localStorage.removeItem('cb_login_username')
    } catch {
      // ignore storage errors
    }

    router.push(callbackUrl)
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center px-4 pb-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-5"
        noValidate
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold">Inicia sessió</h1>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="font-medium">
            Usuari
          </label>
          <input
            id="username"
            name="username"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
            className="w-full h-12 rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-blue-500"
            aria-invalid={!!error}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-medium">
            Contrasenya
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            className="w-full h-12 rounded-lg border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-blue-500"
            aria-invalid={!!error}
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="remember" className="flex items-center gap-2 text-sm">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4"
            />
            Recorda’m
          </label>

          {/* Placeholder per “Has oblidat la contrasenya?” si el voleu activar en el futur */}
          {/* <a href="/forgot" className="text-sm text-blue-600 underline">Has oblidat la contrasenya?</a> */}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-60 active:translate-y-px transition"
        >
          {loading ? 'Entrant…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Carregant…</div>}>
      <LoginInner />
    </Suspense>
  )
}
