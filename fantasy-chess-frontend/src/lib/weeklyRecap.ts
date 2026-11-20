import { supabase } from './supabase'
import { addDaysToYmd, getLeagueLineupWeekBounds, parseCalendarYmd } from './calendarDate'
import type { League } from '../types'

export const SITE_URL = 'https://fantasyleaguechess.com'

export type RecapGame = { event: 'early' | 'late'; round: number; points: number }

export type RecapPlayer = {
  id: string
  name: string
  title: string | null
  points: number
  early: RecapGame[]
  late: RecapGame[]
  earlyScore: number
  lateScore: number
}

export type WeeklyRecap = {
  leagueName: string
  tuesdayYmd: string
  weekNumber: number
  totalWeeks: number
  totalPoints: number
  weekRank: number
  managers: number
  seasonRank: number
  previousSeasonRank: number | null
  players: RecapPlayer[]
}

type LineupRow = {
  user_id: string | null
  bot_id: string | null
  week_start_date: string
  total_points: number | null
  player_ids: string[] | null
}

type GameRow = {
  white: string
  black: string
  result: string | null
  round: number | string | null
  early_late: string | null
  white_points: number | null
  black_points: number | null
}

function weeksBetween(fromYmd: string, toYmd: string): number {
  const ms = parseCalendarYmd(toYmd).getTime() - parseCalendarYmd(fromYmd).getTime()
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000))
}

function participantKey(row: LineupRow): string {
  return row.user_id ? `u:${row.user_id}` : `b:${row.bot_id}`
}

function rankOf(totals: Map<string, number>, key: string): number {
  const mine = totals.get(key) ?? 0
  let above = 0
  totals.forEach((value) => {
    if (value > mine + 1e-9) above++
  })
  return above + 1
}

function tournamentScore(game: GameRow, name: string): number {
  if (game.result === '1/2-1/2') return 0.5
  if (game.result === '1-0' && game.white === name) return 1
  if (game.result === '0-1' && game.black === name) return 1
  return 0
}

/**
 * Everything the share card needs for one manager's Titled Tuesday week in a league.
 * `tuesdayDot` is the Titled Tuesday date as shown in the week picker (YYYY.MM.DD).
 */
export async function fetchWeeklyRecap(
  userId: string,
  league: Pick<League, 'id' | 'name' | 'start_date' | 'end_date'>,
  tuesdayDot: string
): Promise<WeeklyRecap> {
  const tuesdayYmd = tuesdayDot.replace(/\./g, '-')
  const monday = addDaysToYmd(tuesdayYmd, -1)
  const { minMonday, maxMonday } = getLeagueLineupWeekBounds(league.start_date, league.end_date)

  const { data: lineupData, error: lineupError } = await supabase
    .from('lineups')
    .select('user_id, bot_id, week_start_date, total_points, player_ids')
    .eq('league_id', league.id)
    .gte('week_start_date', minMonday)
    .lte('week_start_date', monday)
  if (lineupError) throw lineupError

  const rows = (lineupData || []) as LineupRow[]
  const myKey = `u:${userId}`
  const mine = rows.find((row) => row.user_id === userId && String(row.week_start_date) === monday)
  if (!mine) throw new Error('No lineup for this week')

  const weekTotals = new Map<string, number>()
  const seasonTotals = new Map<string, number>()
  const previousTotals = new Map<string, number>()
  for (const row of rows) {
    const key = participantKey(row)
    const points = Number(row.total_points) || 0
    seasonTotals.set(key, (seasonTotals.get(key) ?? 0) + points)
    if (String(row.week_start_date) === monday) {
      weekTotals.set(key, (weekTotals.get(key) ?? 0) + points)
    } else {
      previousTotals.set(key, (previousTotals.get(key) ?? 0) + points)
    }
  }

  const playerIds = mine.player_ids || []
  const { data: playerData, error: playerError } = playerIds.length
    ? await supabase.from('chess_players').select('*').in('id', playerIds)
    : { data: [], error: null }
  if (playerError) throw playerError
  const lineupPlayers = (playerData || []) as Array<{ id: string; name: string; title?: string | null }>
  const names = lineupPlayers.map((player) => player.name)

  let games: GameRow[] = []
  if (names.length) {
    const columns = 'white, black, result, round, early_late, white_points, black_points'
    const [white, black] = await Promise.all([
      supabase.from('games').select(columns).eq('date', tuesdayDot).in('white', names),
      supabase.from('games').select(columns).eq('date', tuesdayDot).in('black', names),
    ])
    if (white.error) throw white.error
    if (black.error) throw black.error
    games = [...(white.data || []), ...(black.data || [])] as GameRow[]
  }

  const players: RecapPlayer[] = lineupPlayers.map((player) => {
    const early: RecapGame[] = []
    const late: RecapGame[] = []
    let earlyScore = 0
    let lateScore = 0
    for (const game of games) {
      const isWhite = game.white === player.name
      if (!isWhite && game.black !== player.name) continue
      const event = game.early_late === 'late' ? 'late' : 'early'
      const entry: RecapGame = {
        event,
        round: Number(game.round) || 0,
        points: Number(isWhite ? game.white_points : game.black_points) || 0,
      }
      if (event === 'late') {
        late.push(entry)
        lateScore += tournamentScore(game, player.name)
      } else {
        early.push(entry)
        earlyScore += tournamentScore(game, player.name)
      }
    }
    early.sort((a, b) => a.round - b.round)
    late.sort((a, b) => a.round - b.round)
    const points = [...early, ...late].reduce((sum, game) => sum + game.points, 0)
    return {
      id: player.id,
      name: player.name,
      title: player.title || null,
      points,
      early,
      late,
      earlyScore,
      lateScore,
    }
  })
  players.sort((a, b) => b.points - a.points)

  return {
    leagueName: league.name,
    tuesdayYmd,
    weekNumber: weeksBetween(minMonday, monday) + 1,
    totalWeeks: weeksBetween(minMonday, maxMonday) + 1,
    totalPoints: Number(mine.total_points) || 0,
    weekRank: rankOf(weekTotals, myKey),
    managers: weekTotals.size,
    seasonRank: rankOf(seasonTotals, myKey),
    previousSeasonRank: previousTotals.has(myKey) ? rankOf(previousTotals, myKey) : null,
    players,
  }
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'
  return `${n}${suffix}`
}

export function signedPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10
  return `${rounded >= 0 ? '+' : '-'}${Math.abs(rounded).toFixed(1)}`
}

export function formatRecapDate(ymd: string, withYear = false): string {
  return parseCalendarYmd(ymd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  })
}

export type GameTier = 'great' | 'good' | 'even' | 'bad'

/** Per-game fantasy points: an even game is about zero, a clean upset reaches the +12 cap. */
export function gameTier(points: number): GameTier {
  if (points >= 8) return 'great'
  if (points >= 2) return 'good'
  if (points > -2) return 'even'
  return 'bad'
}

const TIER_EMOJI: Record<GameTier, string> = { great: '🟪', good: '🟩', even: '🟨', bad: '🟥' }

export const TIER_COLORS: Record<GameTier, string> = {
  great: '#8B5CF6',
  good: '#6AAA64',
  even: '#C9B458',
  bad: '#E05A4F',
}

export const TIER_LABELS: Record<GameTier, string> = {
  great: '+8 or more',
  good: '+2 to +8',
  even: 'about even',
  bad: '-2 or worse',
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function squares(games: RecapGame[]): string {
  return games.map((game) => TIER_EMOJI[gameTier(game.points)]).join('')
}

function seasonMovement(recap: WeeklyRecap): string {
  if (recap.previousSeasonRank == null) return ''
  const change = recap.previousSeasonRank - recap.seasonRank
  if (change > 0) return ` ⬆️${change}`
  if (change < 0) return ` ⬇️${Math.abs(change)}`
  return ' ➖'
}

function headerLines(recap: WeeklyRecap, includeLeague: boolean): string[] {
  const week = recap.totalWeeks > 1 ? `Week ${recap.weekNumber}/${recap.totalWeeks}` : 'Week 1'
  const lines = [`Fantasy League Chess ♟️ ${week}`]
  if (includeLeague) lines.push(`🏆 ${recap.leagueName}`)
  lines.push(`Titled Tuesday · ${formatRecapDate(recap.tuesdayYmd)}`)
  const medal = MEDALS[recap.weekRank] ? `${MEDALS[recap.weekRank]} ` : ''
  const placing = recap.managers > 1 ? `${medal}${ordinal(recap.weekRank)} of ${recap.managers} · ` : ''
  lines.push(`${placing}${signedPoints(recap.totalPoints)} pts`)
  if (recap.managers > 1 && recap.weekNumber > 1) {
    lines.push(`Season: ${ordinal(recap.seasonRank)}${seasonMovement(recap)}`)
  }
  return lines
}

/** One row of squares per Titled Tuesday session, so a two-session player gets two rows. */
function gridLines(recap: WeeklyRecap): string[] {
  const lines: string[] = []
  for (const player of recap.players) {
    const sessions = [player.early, player.late].filter((games) => games.length > 0)
    if (sessions.length === 0) {
      lines.push('⬜ DNP')
      continue
    }
    sessions.forEach((games, index) => {
      const isLast = index === sessions.length - 1
      lines.push(isLast ? `${squares(games)} ${signedPoints(player.points)}` : squares(games))
    })
  }
  return lines
}

/** Discord and copy-paste version: the full emoji grid. */
export function buildRecapText(recap: WeeklyRecap, includeLeague: boolean): string {
  return [...headerLines(recap, includeLeague), '', ...gridLines(recap), '', SITE_URL].join('\n')
}

/** X counts each emoji as two characters, so the post skips the grid and names the best pick. */
export function buildRecapPostText(recap: WeeklyRecap, includeLeague: boolean): string {
  const lines = headerLines(recap, includeLeague)
  const best = recap.players.find((player) => player.early.length + player.late.length > 0)
  if (best) lines.push(`Top pick: ${best.name} ${signedPoints(best.points)}`)
  return [...lines, '', SITE_URL].join('\n')
}

export function recapPostUrl(recap: WeeklyRecap, includeLeague: boolean): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(buildRecapPostText(recap, includeLeague))}`
}

/** Reddit markdown joins single newlines, so each line ends with a hard break. */
export function recapRedditUrl(recap: WeeklyRecap, includeLeague: boolean): string {
  const title = `My Fantasy League Chess week: ${signedPoints(recap.totalPoints)} pts (Titled Tuesday ${formatRecapDate(recap.tuesdayYmd)})`
  const body = buildRecapText(recap, includeLeague).split('\n').join('  \n')
  return `https://www.reddit.com/submit?type=TEXT&title=${encodeURIComponent(title)}&text=${encodeURIComponent(body)}`
}

// ---------------------------------------------------------------------------
// Image card
// ---------------------------------------------------------------------------

const CARD_W = 1200
const CARD_H = 675
const NAVY = '#1e293b'
const ROYAL = '#4F7FFB'
const GOLD = '#D4A537'
const MUTED = '#64748B'
const FONT = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif'

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let trimmed = text
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  return `${trimmed}…`
}

function pointsColor(points: number): string {
  if (points > 0.05) return '#15803D'
  if (points < -0.05) return '#B91C1C'
  return MUTED
}

function scoreText(score: number, games: number): string {
  const rounded = Math.round(score * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}/${games}`
}

/** 1200x675 PNG (rendered at 2x) that fits X, Discord and Reddit previews without cropping. */
export async function drawRecapImage(recap: WeeklyRecap, includeLeague: boolean): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`400 20px Inter`),
    document.fonts.load(`600 20px Inter`),
    document.fonts.load(`700 20px Inter`),
  ]).catch(() => undefined)
  const logo = await loadImage('/assets/fantasy-league-chess-logo-updated.png')

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W * scale
  canvas.height = CARD_H * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, 20, 20, CARD_W - 40, CARD_H - 40, 24)
  ctx.fill()

  // Left column: week, total and placing.
  const left = 64
  if (logo) ctx.drawImage(logo, left - 8, 44, 112, 112)

  let y = 196
  ctx.fillStyle = GOLD
  ctx.font = `700 16px ${FONT}`
  const weekLabel = recap.totalWeeks > 1 ? `WEEK ${recap.weekNumber} OF ${recap.totalWeeks}` : 'WEEK 1'
  ctx.fillText(weekLabel, left, y)

  y += 38
  ctx.fillStyle = NAVY
  ctx.font = `700 32px ${FONT}`
  ctx.fillText('Titled Tuesday', left, y)
  y += 30
  ctx.fillStyle = MUTED
  ctx.font = `400 20px ${FONT}`
  ctx.fillText(formatRecapDate(recap.tuesdayYmd, true), left, y)
  if (includeLeague) {
    y += 28
    ctx.fillStyle = NAVY
    ctx.font = `600 18px ${FONT}`
    ctx.fillText(fitText(ctx, recap.leagueName, 340), left, y)
  }

  y += 96
  ctx.fillStyle = recap.totalPoints < 0 ? '#B91C1C' : ROYAL
  ctx.font = `700 88px ${FONT}`
  ctx.fillText(signedPoints(recap.totalPoints), left - 4, y)
  y += 32
  ctx.fillStyle = MUTED
  ctx.font = `400 20px ${FONT}`
  ctx.fillText('fantasy points', left, y)

  if (recap.managers > 1) {
    y += 46
    const placing = `${ordinal(recap.weekRank)} of ${recap.managers} this week`
    ctx.font = `600 18px ${FONT}`
    const pillW = ctx.measureText(placing).width + 52
    const medal = ({ 1: '#D4A537', 2: '#A8B0BC', 3: '#C07A45' } as Record<number, string>)[recap.weekRank]
    ctx.fillStyle = medal ? `${medal}22` : '#EEF2FF'
    roundRect(ctx, left, y - 26, pillW, 38, 19)
    ctx.fill()
    ctx.fillStyle = medal || ROYAL
    ctx.beginPath()
    ctx.arc(left + 20, y - 7, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = NAVY
    ctx.fillText(placing, left + 36, y)

    if (recap.weekNumber > 1) {
      y += 40
      ctx.fillStyle = MUTED
      ctx.font = `400 18px ${FONT}`
      const seasonLabel = `Season rank ${ordinal(recap.seasonRank)}`
      ctx.fillText(seasonLabel, left, y)
      if (recap.previousSeasonRank != null) {
        const change = recap.previousSeasonRank - recap.seasonRank
        const x = left + ctx.measureText(seasonLabel).width + 12
        ctx.font = `700 18px ${FONT}`
        ctx.fillStyle = change > 0 ? '#15803D' : change < 0 ? '#B91C1C' : MUTED
        ctx.fillText(change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${Math.abs(change)}` : '—', x, y)
      }
    }
  }

  ctx.fillStyle = MUTED
  ctx.font = `600 16px ${FONT}`
  ctx.fillText('fantasyleaguechess.com', left, CARD_H - 52)

  // Divider.
  ctx.fillStyle = '#E2E8F0'
  ctx.fillRect(452, 64, 2, CARD_H - 128)

  // Right column: lineup rows.
  const rx = 492
  const rw = CARD_W - 64 - rx
  ctx.fillStyle = MUTED
  ctx.font = `700 14px ${FONT}`
  ctx.fillText('LINEUP', rx, 84)
  const lineupW = ctx.measureText('LINEUP').width
  ctx.fillStyle = '#94A3B8'
  ctx.font = `400 14px ${FONT}`
  ctx.fillText('each square is one game', rx + lineupW + 12, 84)
  ctx.fillStyle = MUTED
  ctx.font = `700 14px ${FONT}`
  ctx.textAlign = 'right'
  ctx.fillText('PTS', rx + rw, 84)
  ctx.textAlign = 'left'

  const rows = recap.players.slice(0, 5)
  const rowH = 94
  const square = 22
  const gap = 5
  rows.forEach((player, index) => {
    const top = 104 + index * rowH
    if (index > 0) {
      ctx.fillStyle = '#F1F5F9'
      ctx.fillRect(rx, top - 6, rw, 1)
    }

    let nameX = rx
    if (player.title) {
      ctx.font = `700 13px ${FONT}`
      const badgeW = ctx.measureText(player.title).width + 14
      ctx.fillStyle = `${GOLD}26`
      roundRect(ctx, rx, top + 9, badgeW, 22, 5)
      ctx.fill()
      ctx.fillStyle = '#9A7416'
      ctx.fillText(player.title, rx + 7, top + 25)
      nameX += badgeW + 8
    }

    ctx.fillStyle = pointsColor(player.points)
    ctx.font = `700 26px ${FONT}`
    ctx.textAlign = 'right'
    const played = player.early.length + player.late.length > 0
    ctx.fillText(played ? signedPoints(player.points) : '0.0', rx + rw, top + 30)
    ctx.textAlign = 'left'

    ctx.fillStyle = NAVY
    ctx.font = `700 22px ${FONT}`
    const records = [
      player.early.length ? scoreText(player.earlyScore, player.early.length) : '',
      player.late.length ? scoreText(player.lateScore, player.late.length) : '',
    ].filter(Boolean).join(' · ')
    ctx.fillText(fitText(ctx, player.name, rw - (nameX - rx) - 200), nameX, top + 28)
    if (records) {
      const nameW = Math.min(ctx.measureText(player.name).width, rw - (nameX - rx) - 200)
      ctx.fillStyle = MUTED
      ctx.font = `400 16px ${FONT}`
      ctx.fillText(records, nameX + nameW + 12, top + 28)
    }

    const squaresTop = top + 44
    if (!played) {
      ctx.fillStyle = '#94A3B8'
      ctx.font = `400 16px ${FONT}`
      ctx.fillText('Did not play', rx, squaresTop + 17)
      return
    }
    let x = rx
    ;[player.early, player.late].forEach((session, sessionIndex) => {
      if (session.length === 0) return
      if (sessionIndex === 1 && player.early.length > 0) x += 14
      for (const game of session) {
        ctx.fillStyle = TIER_COLORS[gameTier(game.points)]
        roundRect(ctx, x, squaresTop, square, square, 4)
        ctx.fill()
        x += square + gap
      }
    })
  })

  // Legend.
  let lx = rx
  const ly = CARD_H - 58
  ctx.font = `400 14px ${FONT}`
  ;(['great', 'good', 'even', 'bad'] as GameTier[]).forEach((tier) => {
    ctx.fillStyle = TIER_COLORS[tier]
    roundRect(ctx, lx, ly - 13, 16, 16, 3)
    ctx.fill()
    ctx.fillStyle = MUTED
    ctx.fillText(TIER_LABELS[tier], lx + 22, ly)
    lx += 22 + ctx.measureText(TIER_LABELS[tier]).width + 22
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image'))), 'image/png')
  })
}
