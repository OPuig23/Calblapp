//file: src/components/ui/badge.tsx
'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'
  | 'outline'

export function Badge({
  children,
  className,
  variant = 'default',
}: React.PropsWithChildren<{ className?: string; variant?: BadgeVariant }>) {
  const styles =
    variant === 'success' ? 'bg-green-100 text-green-800'
    : variant === 'warning' ? 'bg-amber-100 text-amber-800'
    : variant === 'destructive' ? 'bg-red-100 text-red-800'
    : variant === 'secondary' ? 'bg-gray-100 text-gray-700 border border-gray-300'
    : variant === 'outline' ? 'bg-transparent text-gray-700 border border-gray-400'
    : 'bg-gray-100 text-gray-800'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        styles,
        className
      )}
    >
      {children}
    </span>
  )
}

export default Badge
