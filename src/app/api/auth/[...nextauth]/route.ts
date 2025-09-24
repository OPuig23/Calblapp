// src/app/api/auth/[...nextauth]/route.ts
export const runtime = 'nodejs'

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { firestore } from '@/lib/firebaseAdmin'
import { normalizeRole } from '@/lib/roles'

const normLower = (s?: string) => (s || '').toString().trim().toLowerCase()

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
        if (!credentials?.username || !credentials.password) return null

        const snap = await firestore
          .collection('users')
          .where('name', '==', credentials.username)
          .get()
        if (snap.empty) return null

        let userRecord: any = null
        for (const doc of snap.docs) {
          const data = doc.data()
          if (data.password === credentials.password) {
            // Backfill userId si falta
            if (!data.userId) {
              await doc.ref.set({ userId: doc.id }, { merge: true })
            }
            const roleNorm   = normalizeRole(data.role)
            const department = (data.department || '').toString().trim()
            userRecord = {
              id: data.userId || doc.id,

              name: data.name,
              role: roleNorm,
              department,
              departmentLower: normLower(department),
            }
            break
          }
        }
        return userRecord
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub        = (user as any).id
        token.role       = normalizeRole((user as any).role)
        token.department = (user as any).department || ''
        token.deptLower  = normLower(token.department)
      }

      // 🔑 Garantim consistència sempre
      if (token.role) token.role = normalizeRole(String(token.role))
      if (!token.deptLower && token.department) {
        token.deptLower = normLower(token.department)
      }

      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id:         token.sub as string,
          role:       token.role as string,
          department: token.department as string,
          deptLower:  token.deptLower as string,
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
