// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'

import NextAuth, { type User, type Session } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { firestore } from '@/lib/firebaseAdmin'
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
}

// 🔹 Extendemos JWT y Session para evitar any
declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    department?: string
    deptLower?: string
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
      async authorize(credentials): Promise<(User & {
        id: string
        role?: string
        department?: string
        departmentLower?: string
      }) | null> {
        if (!credentials?.username || !credentials.password) return null

        const snap = await firestore
          .collection('users')
          .where('name', '==', credentials.username)
          .get()
        if (snap.empty) return null

        for (const doc of snap.docs) {
          const data = doc.data() as unknown as FirestoreUser

          if (data.password === credentials.password) {
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
              departmentLower: normLower(department),
            }
          }
        }
        return null
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: AdapterUser | User }) {
      if (user) {
        const u = user as User & { id: string; role?: string; department?: string }
        token.sub = u.id
        token.role = normalizeRole(u.role)
        token.department = u.department || ''
        token.deptLower = normLower(token.department)
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
