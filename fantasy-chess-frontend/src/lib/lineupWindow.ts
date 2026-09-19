/** Lineup edits are locked for the full Titled Tuesday US Eastern calendar day. */
export function isLineupChangeAllowed(): boolean {
  const easternWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(new Date())

  return easternWeekday !== 'Tue'
}

export function lineupChangeBlockedMessage(): string {
  return 'Lineup changes are locked on Tuesdays (US Eastern) while Titled Tuesday rosters are scored.'
}
