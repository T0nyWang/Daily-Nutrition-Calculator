export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function todayDateKey() {
  return formatDateKey(new Date())
}

export function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)

  return formatDateKey(date)
}
