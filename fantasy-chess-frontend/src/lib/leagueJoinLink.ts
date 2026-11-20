const JOIN_CODE_PATTERN = /^[A-Z0-9]{6}$/

export function normalizeJoinCode(value: string): string {
  return value.trim().toUpperCase()
}

export function isJoinCode(value: string): boolean {
  return JOIN_CODE_PATTERN.test(normalizeJoinCode(value))
}

export function leagueJoinPath(code: string): string {
  return `/join/${normalizeJoinCode(code)}`
}

export function leagueJoinUrl(code: string): string {
  if (typeof window === 'undefined') return leagueJoinPath(code)
  return `${window.location.origin}${leagueJoinPath(code)}`
}

/** Only allow a return path that opens one league invite. */
export function safeJoinNext(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin) return null
    const match = url.pathname.match(/^\/join\/([A-Za-z0-9]{6})$/)
    if (!match || !isJoinCode(match[1])) return null
    return leagueJoinPath(match[1])
  } catch {
    return null
  }
}

export const PENDING_JOIN_KEY = 'flc:join-next'

export function rememberJoinPath(path: string) {
  const next = safeJoinNext(path)
  if (!next) return
  sessionStorage.setItem(PENDING_JOIN_KEY, next)
}

export function takePendingJoinPath(): string | null {
  const next = safeJoinNext(sessionStorage.getItem(PENDING_JOIN_KEY))
  if (next) sessionStorage.removeItem(PENDING_JOIN_KEY)
  return next
}

export function peekPendingJoinPath(): string | null {
  return safeJoinNext(sessionStorage.getItem(PENDING_JOIN_KEY))
}
