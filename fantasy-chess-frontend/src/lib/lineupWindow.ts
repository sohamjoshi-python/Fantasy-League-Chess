/** Lineup edits allowed Monday–Tuesday UTC (matches DB RLS on lineups). */
export function isLineupChangeAllowed(): boolean {
  const day = new Date().getUTCDay()
  return day === 1 || day === 2
}

export function lineupChangeBlockedMessage(): string {
  return 'Lineup changes are only allowed on Monday and Tuesday (UTC), before Titled Tuesday locks your roster for the week.'
}
