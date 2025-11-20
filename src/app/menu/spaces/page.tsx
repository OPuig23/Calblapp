//file: src/app/menu/spaces/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import ModuleHeader from '@/components/layout/ModuleHeader'

export default function SpacesHubPage() {
  return (
    <>
      {/* 🔹 Capçalera automàtica del mòdul */}
      <ModuleHeader />

      <section className="w-full h-full flex flex-col items-center justify-center gap-6 p-6">

    {/* BOTONS */}
        <div className="flex flex-col gap-4 w-full max-w-xs">

          {/* CONSULTAR RESERVES */}
          <Link href="/menu/spaces/reserves">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#e8f0ff] text-[#1b3b8a] font-semibold rounded-xl p-4 text-center shadow-sm border border-[#d6e2ff]"
            >
              Consultar reserves
            </motion.div>
          </Link>

          {/* CONSULTAR ESPAIS (NOU MÒDUL) */}
          <Link href="/menu/spaces/info">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="w-full bg-[#e9f8ee] text-[#155e37] font-semibold rounded-xl p-4 text-center shadow-sm border border-[#c7eed6]"
            >
              Consultar espais
            </motion.div>
          </Link>

        </div>
      </section>
    </>
  )
}
