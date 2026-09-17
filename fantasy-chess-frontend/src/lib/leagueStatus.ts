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

/** Leagues allowed to overlap other leagues you're in. Add IDs here as needed. */
export const CONCURRENT_LEAGUE_IDS = new Set([
  'b0f5950a-fc9a-48a5-9f57-6651dcc1eae1',
])

export function isPlayerAlreadyOwnedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const message = String((error as { message?: string }).message || '')
  const code = String((error as { code?: string }).code || '')
  return (
    code === '23505' ||
    /already owned in this league|already owned/i.test(message)
  )
}

export function isConcurrentLeague(leagueId: string | undefined | null): boolean {
  return !!leagueId && CONCURRENT_LEAGUE_IDS.has(leagueId)
}

function hasDateOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return !(endA < startB || endB < startA)
}

/** True when joining/creating `candidate` should be blocked by another active league. */
export function hasBlockingLeagueOverlap(
  candidate: Pick<League, 'start_date' | 'end_date'> & { id?: string },
  userLeagues: Pick<League, 'id' | 'start_date' | 'end_date'>[],
  today: string = getLocalDateString()
): boolean {
  if (isConcurrentLeague(candidate.id)) return false
  return userLeagues.some((league) => {
    if (isConcurrentLeague(league.id)) return false
    if (!league.end_date || league.end_date < today) return false
    return hasDateOverlap(
      candidate.start_date,
      candidate.end_date,
      league.start_date,
      league.end_date
    )
  })
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
