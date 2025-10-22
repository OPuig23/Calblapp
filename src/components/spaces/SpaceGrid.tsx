//file: src/components/spaces/SpaceGrid.tsx
import { format, addDays, startOfWeek } from 'date-fns'
import { ca } from 'date-fns/locale'
import SpaceCell from './SpaceCell'

// 🔹 Tipus de props del component
interface SpaceGridProps {
  data: {
    finca: string
    dies: {
      eventName?: string
      commercial?: string
      stage?: 'verd' | 'blau' | 'taronja'
    }[]
  }[]
  weekLabel?: string
  baseDate?: string
}

export default function SpaceGrid({ data, weekLabel, baseDate }: SpaceGridProps) {
  // 🔹 Calcula dilluns de la setmana seleccionada (o de l’actual)
  const start = startOfWeek(
    baseDate ? new Date(baseDate) : new Date(),
    { weekStartsOn: 1 }
  )



  // 🔹 Genera 7 dies amb format curt català (Dll 20, Dm 21…)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    const dia = format(date, 'EEE', { locale: ca }) // Dll, Dm, Dx...
    const num = format(date, 'dd', { locale: ca })  // 20, 21...
    return `${dia} ${num}`
  })

  return (
    <div className="overflow-auto mt-4 sm:mt-10 w-full max-w-full">
  <table className="min-w-max text-[10px] sm:text-xs border-collapse text-center">

        <thead>
          <tr className="sticky top-0 bg-gray-100">
            <th className="p-2 text-left">Finca</th>
            {days.map((day, i) => (
              <th key={i} className="p-2 border">
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2 text-left font-semibold">{row.finca}</td>

              {(row.dies ?? Array(7).fill(null)).map((cell, i) => (
                <td key={i} className="p-1">
                  <SpaceCell
                    eventName={cell?.eventName}
                    commercial={cell?.commercial}
                    stageColor={cell?.stage || null}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
