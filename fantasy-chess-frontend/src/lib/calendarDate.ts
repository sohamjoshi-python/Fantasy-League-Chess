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

/** Scheduled drafts open at 10:00 AM Pacific. The owner picks the date only. */
export const DRAFT_OPEN_HOUR = 10
export const DRAFT_TIME_ZONE = 'America/Los_Angeles'

export function ymdInTimeZone(date: Date, timeZone = DRAFT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || '0')
  const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour') % 24, value('minute'), value('second'))
  return asUtc - instant.getTime()
}

/** 10:00 AM Pacific on a YYYY-MM-DD date. */
export function draftOpensAt(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number)
  const utcGuess = new Date(Date.UTC(year, month - 1, day, DRAFT_OPEN_HOUR, 0, 0))
  const firstPass = new Date(utcGuess.getTime() - zoneOffsetMs(utcGuess, DRAFT_TIME_ZONE))
  return new Date(utcGuess.getTime() - zoneOffsetMs(firstPass, DRAFT_TIME_ZONE))
}

/** Today if 10:00 AM Pacific is still ahead, otherwise tomorrow. */
export function earliestDraftScheduleDate(): string {
  const today = ymdInTimeZone(new Date())
  return draftOpensAt(today).getTime() > Date.now() ? today : addDaysToYmd(today, 1)
}

/** Pacific calendar date stored on a scheduled draft. */
export function scheduledDraftDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return ymdInTimeZone(date)
}

/** "Tue, Oct 28 at 10:00 AM Pacific". */
export function formatScheduledDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: DRAFT_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
  return `${day} at 10:00 AM Pacific`
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
 * League end date is the same calendar day one month after the start.
 * 2026-10-01 ends 2026-11-01. A 31st rolls back to the last day of the next month.
 */
export function getLeagueEndDateFromStart(startDateYmd: string): string {
  const start = parseCalendarYmd(startDateYmd)
  const day = start.getDate()
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 12)
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
  end.setDate(Math.min(day, lastDay))
  return getLocalDateString(end)
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

/**
 * Monday whose lineup is still open.
 * After this week's Titled Tuesday games are imported, edits move to next week.
 * A Monday whose Tuesday is before the league starts is never the target:
 * that lineup would not be scored.
 */
export function getOpenLineupMonday(
  leagueStartYmd: string,
  leagueEndYmd: string,
  calendarMondayYmd: string,
  currentTuesdayGamesImported: boolean,
): string {
  const openMonday = currentTuesdayGamesImported
    ? addDaysToYmd(calendarMondayYmd, 7)
    : calendarMondayYmd
  const firstMonday = addDaysToYmd(getFirstTuesdayOnOrAfter(leagueStartYmd), -1)
  const lastMonday = addDaysToYmd(getLastTuesdayOnOrBefore(leagueEndYmd), -1)
  const chosen = compareCalendarDates(openMonday, firstMonday) >= 0 ? openMonday : firstMonday
  return compareCalendarDates(chosen, lastMonday) > 0 ? lastMonday : chosen
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
