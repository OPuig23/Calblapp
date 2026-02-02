type FormatDateOptions = {
  includeTime?: boolean
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

export function formatDateString(value: string | undefined | null, options?: FormatDateOptions) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const day = pad(parsed.getDate())
  const month = pad(parsed.getMonth() + 1)
  const year = parsed.getFullYear()
  const datePart = `${day}/${month}/${year}`

  if (options?.includeTime) {
    const hours = pad(parsed.getHours())
    const minutes = pad(parsed.getMinutes())
    const seconds = pad(parsed.getSeconds())
    return `${datePart} ${hours}:${minutes}:${seconds}`
  }

  return datePart
}
