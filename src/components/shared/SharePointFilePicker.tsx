// file: src/components/shared/SharePointFilePicker.tsx
'use client'

import * as React from 'react'
import { Providers } from '@microsoft/mgt-element'
import { Msal2Provider } from '@microsoft/mgt-msal2-provider'
import '@microsoft/mgt-components'

type PickedFile = { name: string; webUrl: string }

interface SharePointFilePickerProps {
  onPicked: (files: PickedFile[]) => void
  multiple?: boolean // (ara mateix fem selecció simple; es pot ampliar)
}

export default function SharePointFilePicker({
  onPicked,
}: SharePointFilePickerProps) {
  const [ready, setReady] = React.useState(false)
  const pickerRef = React.useRef<HTMLElement | null>(null)

// Init MSAL provider un sol cop
React.useEffect(() => {
  if (!Providers.globalProvider) {
    const provider = new Msal2Provider({
      clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
      scopes: ['User.Read', 'Files.ReadWrite.All', 'Sites.ReadWrite.All'],
    }) as any // 👈 forcem tipus genèric per evitar l’error TS

    provider.options = { loginType: 'popup' } // 👈 assignem loginType així

    Providers.globalProvider = provider
  }
  setReady(true)
}, [])

  // Escolta l’event de selecció de fitxers del web component
  React.useEffect(() => {
    if (!ready || !pickerRef.current) return

    const el = pickerRef.current as any
    const handleFilesSelected = (e: any) => {
      const files: PickedFile[] =
        e?.detail?.files?.map((f: any) => ({
          name: f?.name ?? 'Document',
          webUrl: f?.webUrl ?? '',
        })) ?? []
      onPicked(files)
    }

    el.addEventListener('filesSelected', handleFilesSelected)
    return () => el.removeEventListener('filesSelected', handleFilesSelected)
  }, [ready, onPicked])

  if (!ready) return null

  return (
    <div className="mt-2">
      {/* Web Component natiu de Microsoft Graph */}
      <mgt-file-picker
        ref={pickerRef}
        resource="/me/drive/root"
        scopes="Files.ReadWrite.All"
      /> 
    </div>
  )
}
