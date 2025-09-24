// src/components/ui/modal.tsx
'use client'

import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

export const Modal = Dialog.Root
export const ModalTrigger = Dialog.Trigger
export const ModalOverlay = Dialog.Overlay
export const ModalContent = Dialog.Content

// Header amb Dialog.Title per accessibilitat Radix
export function ModalHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2 border-b font-semibold">
      <Dialog.Title className="text-lg">{children}</Dialog.Title>
    </div>
  )
}

// Cos principal del modal
export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className="p-4">{children}</div>
}

// Footer amb botons
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-2 border-t text-right">{children}</div>
}

// Botó de tancament
export function ModalClose({ children }: { children: React.ReactNode }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>
}