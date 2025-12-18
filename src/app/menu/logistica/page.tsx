//file: src/app/menu/logistica/page.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import ModuleHeader from '@/components/layout/ModuleHeader'
import { ClipboardList, Truck } from 'lucide-react'

export default function LogisticsHubPage() {
  return (
    <>
      {/* 🔹 Capçalera automàtica del mòdul */}
      <ModuleHeader />

      <section className="w-full h-full flex flex-col items-center justify-center gap-6 p-6">

        {/* BOTONS */}
       <div className="flex flex-col gap-4 w-full max-w-xs">

  {/* PREPARACIÓ LOGÍSTICA */}
  <Link href="/menu/logistica/preparacio">
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="
        w-full 
        bg-[#e9f8ee] 
        text-[#155e37] 
        font-semibold 
        rounded-xl 
        p-4 
        text-center 
        shadow-sm 
        border border-[#c7eed6]
        flex flex-col items-center gap-1
      "
    >
      <ClipboardList className="w-6 h-6 text-[#155e37]" />
      Preparació logística
    </motion.div>
  </Link>

 {/* ASSIGNACIONS */}
<Link href="/menu/logistica/assignacions">
  <motion.div
    whileTap={{ scale: 0.97 }}
    className="
      w-full 
      bg-[#eef2ff]
      text-[#3730a3]
      font-semibold 
      rounded-xl 
      p-4 
      text-center 
      shadow-sm 
      border border-[#c7d2fe]
      flex flex-col items-center gap-1
    "
  >
    <Truck className="w-6 h-6 text-[#3730a3]" />
    Assignacions
  </motion.div>
</Link>

  {/* TRANSPORTS */}
  <Link href="/menu/logistica/transports">
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="
        w-full 
        bg-[#fff4e5] 
        text-[#b45309] 
        font-semibold 
        rounded-xl 
        p-4 
        text-center 
        shadow-sm 
        border border-[#fde2bd]
        flex flex-col items-center gap-1
      "
    >
      <Truck className="w-6 h-6 text-[#b45309]" />
      Transports
    </motion.div>
  </Link>

</div>

      </section>
    </>
  )
}
