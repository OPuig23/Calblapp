// /src/components/reports/SummaryCards.tsx
import { Card } from "@/components/ui/card"
import { User, Clock, Zap, Star } from "lucide-react"

export function SummaryCards({ stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 my-4 md:grid-cols-4">
      <Card className="flex flex-col items-center p-3 rounded-2xl shadow-xl">
        <User className="w-7 h-7 text-blue-500" />
        <div className="font-bold text-xl">{stats.totalPersonnel}</div>
        <div className="text-xs text-gray-500">Personal</div>
      </Card>
      <Card className="flex flex-col items-center p-3 rounded-2xl shadow-xl">
        <Clock className="w-7 h-7 text-green-500" />
        <div className="font-bold text-xl">{stats.totalHours}</div>
        <div className="text-xs text-gray-500">Total hores</div>
      </Card>
      <Card className="flex flex-col items-center p-3 rounded-2xl shadow-xl">
        <Zap className="w-7 h-7 text-orange-500" />
        <div className="font-bold text-xl">{stats.extraHours}</div>
        <div className="text-xs text-gray-500">Extres</div>
      </Card>
      <Card className="flex flex-col items-center p-3 rounded-2xl shadow-xl">
        <Star className="w-7 h-7 text-yellow-500" />
        <div className="font-bold text-xl">{stats.topResponsables}</div>
        <div className="text-xs text-gray-500">Responsables top 5</div>
      </Card>
    </div>
  )
}
