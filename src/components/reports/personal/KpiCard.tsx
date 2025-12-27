type Props = { title: string; value: string; footer?: string }

export default function KpiCard({ title, value, footer }: Props) {
  return (
    <div className="bg-white border rounded-xl p-4 shadow-sm">
      <p className="text-xs uppercase text-gray-500 font-semibold">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {footer && <p className="text-xs text-gray-500 mt-1">{footer}</p>}
    </div>
  )
}
