// Same integer split as public.league_place_payout. The credit includes the
// refund of half the buy-in. The buy-in was already taken when the manager joined.
export function leaguePlacePayout(buyIn: number, finishers: number, place: number): number {
  const buy = Math.max(0, Math.floor(Number(buyIn) || 0))
  const count = Math.max(0, Math.floor(Number(finishers) || 0))
  if (buy === 0 || count === 0 || place < 1 || place > count) return 0

  const refund = Math.floor(buy / 2)
  const pool = buy * count - refund * count
  if (count === 1) return refund + pool

  const first = Math.floor(pool / 2)
  const second = Math.floor((pool * 30) / 100)
  const third = pool - first - second
  if (count === 2) {
    if (place === 1) return refund + first + third
    if (place === 2) return refund + second
    return refund
  }
  if (place === 1) return refund + first
  if (place === 2) return refund + second
  if (place === 3) return refund + third
  return refund
}
