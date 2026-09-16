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

/** Earliest allowed league start date: 7 days from today (local). */
export function getMinLeagueStartDateString(): string {
  return addDaysToYmd(getLocalDateString(), 7)
}

/** Calendar day the turn-based marketplace auto-starts if the owner has not started it. */
export function getMarketplaceAutoStartDate(startDateYmd: string): string {
  return addDaysToYmd(startDateYmd, -7)
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
  const d = parseCalendarYmd(ymd)
  d.setDate(d.getDate() + days)
  return getLocalDateString(d)
}

/** Parse YYYY-MM-DD as a local calendar date (noon avoids DST edge cases). */
export function parseCalendarYmd(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`)
}

/**
 * League end date: Wednesday after the last eligible Titled Tuesday in the
 * month after the start month. This keeps the league active through the
 * Tuesday scoring/email job and the Wednesday backup job.
 * e.g. start 2026-05-15 -> last TT 2026-06-30 -> end 2026-07-01
 */
export function getLeagueEndDateFromStart(startDateYmd: string): string {
  const d = parseCalendarYmd(startDateYmd)
  d.setMonth(d.getMonth() + 2, 0)
  return addDaysToYmd(getLastTuesdayOnOrBefore(getLocalDateString(d)), 1)
}

/** Monday lineup week_start_date → Titled Tuesday display (YYYY.MM.DD). */
export function mondayYmdToTuesdayDot(mondayYmd: string): string {
  return addDaysToYmd(mondayYmd, 1).replace(/-/g, '.')
}

/** First Titled Tuesday (local) on or after a calendar date. */
export function getFirstTuesdayOnOrAfter(ymd: string): string {
  let d = ymd
  while (parseCalendarYmd(d).getDay() !== 2) {
    d = addDaysToYmd(d, 1)
  }
  return d
}

/** Last Titled Tuesday (local) on or before a calendar date. */
export function getLastTuesdayOnOrBefore(ymd: string): string {
  let d = ymd
  while (parseCalendarYmd(d).getDay() !== 2) {
    d = addDaysToYmd(d, -1)
  }
  return d
}

/** Monday bounds for lineup queries within a league season. */
export function getLeagueLineupWeekBounds(startDateYmd: string, endDateYmd: string): {
  minMonday: string
  maxMonday: string
} {
  const minMonday = addDaysToYmd(getFirstTuesdayOnOrAfter(startDateYmd), -1)
  const maxMonday = addDaysToYmd(getLastTuesdayOnOrBefore(endDateYmd), -1)
  return { minMonday, maxMonday }
}
