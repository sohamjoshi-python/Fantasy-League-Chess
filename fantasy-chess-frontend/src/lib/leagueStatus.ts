import { League } from '../types'
import {
  compareCalendarDates,
  getLocalDateString,
  getMarketplaceAutoStartDate,
  leagueSeasonHasEndedLocal,
  leagueSeasonHasStartedLocal,
} from './calendarDate'

export {
  getMarketplaceAutoStartDate,
  getMinLeagueStartDateString,
  leagueSeasonHasEndedLocal,
  leagueSeasonHasStartedLocal,
} from './calendarDate'

export function isPlayerAlreadyOwnedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: string }).message || '')
  const code = String((error as { code?: string }).code || '')
  return (
    code === '23505' ||
    /already owned in this league|already owned/i.test(message)
  )
}

/** Display a YYYY-MM-DD string in the user's locale without UTC day shift. */
export function formatCalendarDate(ymd: string): string {
  if (!ymd) return ''
  return new Date(`${ymd}T12:00:00`).toLocaleDateString()
}

/** True when new members must not be added (draft / marketplace / season started). */
export function isLeagueJoinClosed(
  league: Pick<
    League,
    | 'draft_started'
    | 'draft_completed'
    | 'marketplace_started'
    | 'marketplace_completed'
    | 'start_date'
  >
): boolean {
  return (
    !!league.draft_started ||
    !!league.draft_completed ||
    !!league.marketplace_started ||
    !!league.marketplace_completed ||
    leagueSeasonHasStartedLocal(league.start_date)
  )
}

/** True when the turn-based marketplace should auto-start (week before start_date, if not already started). */
export function isMarketplaceAutoStartDue(
  league: Pick<
    League,
    | 'start_date'
    | 'end_date'
    | 'marketplace_started'
    | 'marketplace_completed'
    | 'draft_completed'
  >
): boolean {
  if (league.marketplace_started || league.marketplace_completed || league.draft_completed) {
    return false
  }
  if (!league.start_date || leagueSeasonHasEndedLocal(league.end_date)) {
    return false
  }
  return compareCalendarDates(getLocalDateString(), getMarketplaceAutoStartDate(league.start_date)) >= 0
}

/** Turn-based marketplace or legacy snake draft is finished. */
export function isTeamBuildingComplete(league: League): boolean {
  if (league.marketplace_completed) return true
  if (league.draft_completed) return true
  if (
    league.marketplace_started &&
    league.marketplace_order &&
    league.marketplace_order.length === 0
  ) {
    return true
  }

  const marketplaceLen = league.marketplace_order?.length ?? 0
  if (
    league.marketplace_started &&
    marketplaceLen > 0 &&
    (league.current_marketplace_turn ?? 0) >= marketplaceLen
  ) {
    return true
  }

  const draftLen = league.draft_order?.length ?? 0
  if (league.draft_started && draftLen > 0 && league.current_draft_turn >= draftLen) {
    return true
  }

  return false
}

export function getTeamBuildingStatusLabel(league: League): string {
  if (isTeamBuildingComplete(league)) return 'Completed'
  if (league.marketplace_started || league.draft_started) return 'In Progress'
  return 'Not Started'
}

/** Coin trading marketplace can be shown (turn-based draft finished and was started). */
export function isCoinMarketplaceAvailable(league: League): boolean {
  return isTeamBuildingComplete(league) && !!league.marketplace_started
}

export const MARKETPLACE_TURN_TIMEOUT_HOURS = 12
export const MARKETPLACE_TURN_TIMEOUT_MS = MARKETPLACE_TURN_TIMEOUT_HOURS * 60 * 60 * 1000
const MIN_MARKETPLACE_TURN_TIMEOUT_HOURS = 0.25
const FORCE_SKIP_TIMEOUT_HOURS = 1 / 60
/** Snake-draft picks each manager gets before the open marketplace. */
export const SNAKE_DRAFT_ROUNDS = 3

export type MarketplaceTimeoutLeague = Pick<
  League,
  'id' | 'start_date' | 'marketplace_order' | 'current_marketplace_turn' | 'member_ids'
>

function pacificMidnightMs(ymd: string): number {
  const utc = new Date(`${ymd}T00:00:00Z`)
  const asPacific = new Date(utc.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  return utc.getTime() + (utc.getTime() - asPacific.getTime())
}

function formatTimeoutHours(hours: number): string {
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60))
    return minutes === 1 ? '1 minute' : `${minutes} minutes`
  }
  const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10
  return rounded === 1 ? '1 hour' : `${rounded} hours`
}

/** Hours each manager has for the current snake-draft pick. Shrinks so remaining picks finish before start_date. */
export function computeMarketplaceTurnTimeoutHours(league?: MarketplaceTimeoutLeague | null): number {
  if (!league?.id) return MARKETPLACE_TURN_TIMEOUT_HOURS
  if (isTestFiveMinuteDraftLeague(league.id)) return TEST_DRAFT_TIMEOUT_MS / (60 * 60 * 1000)
  if (!league.start_date) return MARKETPLACE_TURN_TIMEOUT_HOURS

  const remainingPicks = Math.max(
    1,
    (league.marketplace_order?.length || (league.member_ids?.length || 1) * SNAKE_DRAFT_ROUNDS) -
      (league.current_marketplace_turn || 0)
  )
  const hoursLeft = (pacificMidnightMs(league.start_date) - Date.now()) / (60 * 60 * 1000)
  if (hoursLeft <= 0) return FORCE_SKIP_TIMEOUT_HOURS
  return Math.min(
    MARKETPLACE_TURN_TIMEOUT_HOURS,
    Math.max(MIN_MARKETPLACE_TURN_TIMEOUT_HOURS, hoursLeft / remainingPicks)
  )
}

/**
 * Fallback 5-minute draft IDs until `five_minute_draft_leagues` is loaded.
 * The live list lives in that table — add/remove rows there, not here.
 */
export const TEST_FIVE_MINUTE_DRAFT_LEAGUE_ID = '1465e20b-f06b-4a89-8e3f-d675759af0c4'
const FIVE_MINUTE_DRAFT_LEAGUE_FALLBACK_IDS = [
  TEST_FIVE_MINUTE_DRAFT_LEAGUE_ID,
  '2f17a311-69ef-40ed-b7ad-10ce95dc0210',
  'a354e52c-9c02-4c44-9c52-a5e3aa751c0d',
]
export const TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS = new Set(FIVE_MINUTE_DRAFT_LEAGUE_FALLBACK_IDS)
const TEST_DRAFT_TIMEOUT_MS = 5 * 60 * 1000
let fiveMinuteDraftLeaguesLoaded = false
let fiveMinuteDraftLeaguesLoad: Promise<void> | null = null

function normalizeLeagueId(leagueId?: string | null): string {
  return String(leagueId || '').trim().toLowerCase()
}

function replaceFiveMinuteDraftLeagueIds(ids: string[]) {
  TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS.clear()
  for (const id of ids) {
    const normalized = normalizeLeagueId(id)
    if (normalized) TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS.add(normalized)
  }
}

/** Loads the 5-minute draft league list from `five_minute_draft_leagues`. */
export async function loadFiveMinuteDraftLeagueIds(): Promise<void> {
  if (fiveMinuteDraftLeaguesLoad) return fiveMinuteDraftLeaguesLoad
  fiveMinuteDraftLeaguesLoad = (async () => {
    try {
      const { supabase } = await import('./supabase')
      const { data, error } = await supabase.from('five_minute_draft_leagues').select('league_id')
      if (error) {
        console.error('Error loading five-minute draft leagues:', error)
        return
      }
      replaceFiveMinuteDraftLeagueIds((data || []).map((row) => String(row.league_id || '')))
      fiveMinuteDraftLeaguesLoaded = true
    } catch (error) {
      console.error('Error loading five-minute draft leagues:', error)
    } finally {
      if (!fiveMinuteDraftLeaguesLoaded) fiveMinuteDraftLeaguesLoad = null
    }
  })()
  return fiveMinuteDraftLeaguesLoad
}

export function isTestFiveMinuteDraftLeague(leagueId?: string | null): boolean {
  if (TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS.has(normalizeLeagueId(leagueId))) return true
  if (typeof window === 'undefined') return false
  const fromPath = window.location.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
  return TEST_FIVE_MINUTE_DRAFT_LEAGUE_IDS.has(normalizeLeagueId(fromPath?.[0]))
}

export function getMarketplaceTurnTimeoutMs(
  league?: MarketplaceTimeoutLeague | string | null
): number {
  if (typeof league === 'string' || !league) {
    const leagueId = typeof league === 'string' ? league : null
    if (isTestFiveMinuteDraftLeague(leagueId)) return TEST_DRAFT_TIMEOUT_MS
    return MARKETPLACE_TURN_TIMEOUT_MS
  }
  return computeMarketplaceTurnTimeoutHours(league) * 60 * 60 * 1000
}

export function getMarketplaceTurnTimeoutHours(
  league?: MarketplaceTimeoutLeague | string | null
): number {
  return getMarketplaceTurnTimeoutMs(league) / (60 * 60 * 1000)
}

export function getMarketplaceTurnTimeoutLabel(
  league?: MarketplaceTimeoutLeague | string | null
): string {
  if (typeof league === 'string' || !league) {
    if (isTestFiveMinuteDraftLeague(typeof league === 'string' ? league : null)) return '5 minutes'
    return `${MARKETPLACE_TURN_TIMEOUT_HOURS} hours`
  }
  if (isTestFiveMinuteDraftLeague(league.id)) return '5 minutes'
  return formatTimeoutHours(computeMarketplaceTurnTimeoutHours(league))
}

/** Milliseconds until the current snake-draft pick is auto-skipped. Negative means expired. */
export function getMarketplaceTurnMsRemaining(
  turnStartedAt: string | null | undefined,
  nowMs: number = Date.now(),
  league?: MarketplaceTimeoutLeague | string | null
): number | null {
  if (!turnStartedAt) return null
  const startedMs = Date.parse(turnStartedAt)
  if (Number.isNaN(startedMs)) return null
  return startedMs + getMarketplaceTurnTimeoutMs(league) - nowMs
}

export function formatMarketplaceTurnRemaining(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(clamped / 3600)
  const minutes = Math.floor((clamped % 3600) / 60)
  const seconds = clamped % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/** Keep the current picker when member_ids change but the draft is already underway. */
export function preserveMarketplaceTurn(
  previousOrder: string[],
  previousTurn: number,
  newOrder: string[]
): number {
  if (newOrder.length === 0) return 0
  const currentPicker = previousOrder[previousTurn]
  if (currentPicker) {
    const idx = newOrder.indexOf(currentPicker)
    if (idx !== -1) return idx
  }
  return Math.min(previousTurn, Math.max(0, newOrder.length - 1))
}
