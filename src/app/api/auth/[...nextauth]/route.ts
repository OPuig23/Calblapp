// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'

import NextAuth, { type User, type Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { firestoreAdmin as firestore } from '@/lib/firebaseAdmin'

import { normalizeRole } from '@/lib/roles'
import type { JWT } from 'next-auth/jwt'
import type { AdapterUser } from 'next-auth/adapters'

// Helpers
const normLower = (s?: string) => (s || '').toString().trim().toLowerCase()

// 🔹 Documento User en Firestore
interface FirestoreUser {
  userId?: string
  name?: string
  password?: string
  role?: string
  department?: string
  pushEnabled?: boolean
}

// 🔹 Extendemos JWT y Session para evitar any
declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    department?: string
    deptLower?: string
    pushEnabled?: boolean

  }
}

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string
      role?: string
      department?: string
      deptLower?: string
    } & User
  }
}

export const authOptions = {
  debug: true,
  providers: [
    CredentialsProvider({
      name: 'Usuari i Contrasenya (Firebase)',
      credentials: {
        username: { label: 'Usuari', type: 'text' },
        password: { label: 'Contrasenya', type: 'password' },
      },
     async authorize(credentials) {
  if (!credentials?.username || !credentials.password) {
    console.log("❌ Falta usuari o password")
    return null
  }

  console.log("🔎 Intent login amb:", credentials.username)

  const snap = await firestore
    .collection('users')
    .where('name', '==', credentials.username)
    .get()

  if (snap.empty) {
    console.log("❌ Usuari no trobat:", credentials.username)
    return null
  }

  for (const doc of snap.docs) {
    const data = doc.data() as FirestoreUser
    console.log("✅ Usuari trobat:", data)

    // Ens assegurem que tot sigui string
    const passDoc = (data.password || '').toString().trim()
    const passInput = credentials.password.toString().trim()

    if (passDoc === passInput) {
      console.log("✅ Password correcte per:", data.name)

      if (!data.userId) {
        await doc.ref.set({ userId: doc.id }, { merge: true })
      }

      const roleNorm = normalizeRole(data.role)
      const department = (data.department || '').toString().trim()

      return {
        id: data.userId || doc.id,
        name: data.name || '',
        role: roleNorm,
        department,
        deptLower: normLower(department),
        pushEnabled: data.pushEnabled ?? false,
      }
    } else {
      console.log("❌ Password incorrecte. Input:", passInput, "Doc:", passDoc)
    }
  }

  return null
}
,
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: AdapterUser | User }) {
   if (user) {
  const u = user as User & {
    id: string
    role?: string
    department?: string
    pushEnabled?: boolean
  }

  token.sub = u.id
  token.role = normalizeRole(u.role)
  token.department = u.department || ''
  token.deptLower = normLower(token.department)
  token.pushEnabled = u.pushEnabled ?? false        // 👈 AFEGIT
}


      if (token.role) {
        token.role = normalizeRole(String(token.role))
      }
      if (!token.deptLower && token.department) {
        token.deptLower = normLower(token.department)
      }

      return token
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
          role: token.role,
          department: token.department,
          deptLower: token.deptLower,
          pushEnabled: token.pushEnabled ?? false,
        },
        accessToken: token,
      }
    },
  },
  pages: { signIn: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
