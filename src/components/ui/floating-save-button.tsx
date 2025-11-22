'use client'

import { Save } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function FloatingSaveButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        `
        fixed 
        bottom-6 right-[90px]     /* Just a l’esquerra del botó + */
        h-14 w-14 
        rounded-full 
        bg-gray-700 
        text-white 
        shadow-xl 
        flex items-center justify-center
        hover:bg-gray-800
        transition
        z-50
        `,
        className
      )}
    >
      <Save className="h-7 w-7" />
    </motion.button>
  )
}
