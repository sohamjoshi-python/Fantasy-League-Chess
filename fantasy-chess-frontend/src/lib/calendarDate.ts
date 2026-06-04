/**
 * Calendar YYYY-MM-DD strings from the app and DB are meant as local calendar dates,
 * not UTC instants. Use these helpers instead of Date#toISOString().split('T")[0]
 * or `new Date("YYYY-MM-DD")` comparisons, which skew across timezones.
 */

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Lexicographic compare works for YYYY-MM-DD strings. */
export function compareCalendarDates(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** True when the league's start calendar day is today or earlier (local). */
export function leagueSeasonHasStartedLocal(startDateYmd: string): boolean {
  return compareCalendarDates(getLocalDateString(), startDateYmd) >= 0
}

/** True when the league's end calendar day is before today (local). */
export function leagueSeasonHasEndedLocal(endDateYmd: string): boolean {
  return compareCalendarDates(endDateYmd, getLocalDateString()) < 0
}

export function getTomorrowDateString(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateString(tomorrow)
}

/** Monday of the week containing `date` (local), as YYYY-MM-DD. */
export function getWeekStartMonday(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const daysToSubtract = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysToSubtract)
  return getLocalDateString(d)
}

export function addDaysToYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return getLocalDateString(d)
}
