/** Lineup edits are locked for the full Titled Tuesday UTC calendar day. */
export function isLineupChangeAllowed(): boolean {
  const day = new Date().getUTCDay()
  return day !== 2
}

export function lineupChangeBlockedMessage(): string {
  return 'Lineup changes are locked on Tuesdays (UTC) while Titled Tuesday rosters are scored. Please try again after Tuesday UTC.'
}
