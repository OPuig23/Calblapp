// ✅ file: src/components/spaces/SpaceCell.tsx
import { STAGE_COLORS } from '@/lib/colors'

interface SpaceCellProps {
  eventName?: string
  commercial?: string
  numPax?: number
  stageColor: 'verd' | 'blau' | 'taronja' | 'lila' | null
}

export default function SpaceCell({ eventName, commercial, numPax, stageColor }: SpaceCellProps) {
  const baseColor = stageColor ? STAGE_COLORS[stageColor] : 'bg-gray-50 text-gray-700'

  const shortEvent =
    eventName && eventName.length > 25
      ? eventName.slice(0, 25).trim() + '…'
      : eventName || ''

  const titleText = [eventName, commercial, numPax ? `${numPax} pax` : '']
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`rounded-md p-1 h-12 flex flex-col justify-center text-[11px] ${baseColor}`}
      title={titleText}
    >
      {shortEvent && <span className="font-medium truncate">{shortEvent}</span>}
      {commercial && <span className="text-[10px] truncate opacity-80">{commercial}</span>}
      {typeof numPax === 'number' && numPax > 0 && (
        <span className="text-[10px] font-semibold">{numPax} pax</span>
      )}
    </div>
  )
}
