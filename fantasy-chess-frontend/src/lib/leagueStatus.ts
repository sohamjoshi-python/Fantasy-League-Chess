import { League } from '../types'
import { leagueSeasonHasStartedLocal } from './calendarDate'

export {
  leagueSeasonHasEndedLocal,
  leagueSeasonHasStartedLocal,
} from './calendarDate'

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
