'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { ClipboardList, Truck } from 'lucide-react'
import { getVisibleModules } from '@/lib/accessControl'

export default function LogisticsHubPage() {
  const { data: session } = useSession()
  const user = session?.user

  // 🔐 Obtenim el mòdul Logística segons permisos reals
  const logisticaModule = getVisibleModules({
    role: user?.role,
    department: user?.department,
  }).find(m => m.path === '/menu/logistica')

  // 🧩 Submòduls visibles
  const submodules = logisticaModule?.submodules ?? []

  return (
    <>
      {/* 🔹 Capçalera automàtica del mòdul */}
      <ModuleHeader />

      <section className="w-full h-full flex flex-col items-center justify-center gap-6 p-6">
        <div className="flex flex-col gap-4 w-full max-w-xs">

          {submodules.map(sub => {
            // 🎨 Estils per submòdul (opcional però clar)
            const isPreparacio = sub.path.includes('preparacio')
            const isAssignacions = sub.path.includes('assignacions')
            const isTransports = sub.path.includes('transports')

            const Icon = isPreparacio ? ClipboardList : Truck

            const styles = isPreparacio
              ? 'bg-[#e9f8ee] text-[#155e37] border-[#c7eed6]'
              : isAssignacions
              ? 'bg-[#eef2ff] text-[#3730a3] border-[#c7d2fe]'
              : 'bg-[#fff4e5] text-[#b45309] border-[#fde2bd]'

            return (
              <Link key={sub.path} href={sub.path}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className={`
                    w-full 
                    font-semibold 
                    rounded-xl 
                    p-4 
                    text-center 
                    shadow-sm 
                    border 
                    flex flex-col 
                    items-center 
                    gap-1
                    ${styles}
                  `}
                >
                  <Icon className="w-6 h-6" />
                  {sub.label}
                </motion.div>
              </Link>
            )
          })}

          {/* 🟡 Si no hi ha submòduls visibles (cas límit) */}
          {!submodules.length && (
            <p className="text-sm text-gray-500 text-center">
              No tens accés a cap secció de Logística.
            </p>
          )}

        </div>
      </section>
    </>
  )
}
