//file: src/components/spaces/SpaceCell.tsx
interface SpaceCellProps {
  eventName?: string
  commercial?: string
  stageColor: 'verd' | 'blau' | 'taronja' | null
}

export default function SpaceCell({ eventName, commercial, stageColor }: SpaceCellProps) {
  const colorMap: Record<string, string> = {
    verd: 'bg-green-200',
    blau: 'bg-blue-200',
    taronja: 'bg-orange-200',
  }

  // 🔹 Limita el nom a 25 caràcters
  const shortEvent =
    eventName && eventName.length > 25
      ? eventName.slice(0, 25).trim() + '…'
      : eventName || ''

  return (
    <div
      className={`rounded-lg p-1 h-12 flex flex-col justify-center text-xs ${
        stageColor ? colorMap[stageColor] : 'bg-gray-50'
      }`}
    >
      {shortEvent && <span className="font-medium truncate">{shortEvent}</span>}
      {commercial && (
        <span className="text-[10px] truncate opacity-80">{commercial}</span>
      )}
    </div>
  )
}
