// file: src/components/ui/tabs.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  value: string
}

export function Tabs({ children, value, className, ...props }: TabsProps) {
  return (
    <div
      data-state={value}
      className={cn("flex flex-col", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn("flex space-x-1 bg-gray-100 p-1", className)}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  return (
    <button
      role="tab"
      data-state={value}
      className={cn(
        "px-3 py-1 rounded-md text-sm font-medium",
        className
      )}
      {...props}
    />
  )
}
