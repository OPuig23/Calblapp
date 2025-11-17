//file:src\components\ui\ConfirmQuadrantButton.tsx
'use client'

import { Button } from './button'
import { useQuadrant } from '@/hooks/useQuadrant'
import { motion } from 'framer-motion'

export function ConfirmQuadrantButton({ department }: { department: string }) {
  const { status, confirmQuadrant } = useQuadrant()

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        onClick={() => confirmQuadrant(department)}
        disabled={status !== 'preview'}
      >
        {status === 'confirming'
          ? 'Confirmant...'
          : status === 'confirmed'
          ? 'Quadrant Confirmat ✓'
          : 'Confirmar Quadrant'}
      </Button>
    </motion.div>
  )
}
