// /src/components/reports/ExportButton.tsx
import { Button } from "@/components/ui/button"
import Papa from "papaparse"

export function ExportButton({ data }) {
  function handleExport() {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "informe-personal.csv"
    link.click()
  }
  return <Button onClick={handleExport} variant="outline">Exportar CSV</Button>
}
