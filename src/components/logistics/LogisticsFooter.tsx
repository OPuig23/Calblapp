// ✅ file: src/components/logistics/LogisticsFooter.tsx
'use client'

interface LogisticsFooterProps {
  role: string
  lastUpdated?: Date
  onConfirm?: () => void
}

export default function LogisticsFooter({ role, lastUpdated, onConfirm }: LogisticsFooterProps) {
  const canEdit = ['cap', 'direccio', 'admin'].includes(role)
  const text =
    lastUpdated ? `Actualitzat fa ${Math.floor((Date.now() - lastUpdated.getTime()) / 60000)} min` : ''

  return (
    <footer className="sticky bottom-0 w-full bg-gray-50 border-t shadow-inner p-3 flex justify-center items-center">
      {canEdit ? (
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
        >
          Confirmar ordre
        </button>
      ) : (
        <span className="text-gray-500 text-xs">{text}</span>
      )}
    </footer>
  )
}
