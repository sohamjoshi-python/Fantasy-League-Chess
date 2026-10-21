import { supabase } from './supabase'
import type { User } from '../types'

const memory = new Map<string, unknown>()

export function readView<T>(key: string): T | null {
  if (memory.has(key)) return memory.get(key) as T
  try {
    const raw = localStorage.getItem(`flc:${key}`)
    if (!raw) return null
    const value = JSON.parse(raw) as T
    memory.set(key, value)
    return value
  } catch {
    return null
  }
}

export function writeView<T>(key: string, value: T) {
  memory.set(key, value)
  try {
    localStorage.setItem(`flc:${key}`, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked. The in-memory copy still helps this visit.
  }
}

export function clearUserViews(userId: string) {
  const prefix = `${userId}:`
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) memory.delete(key)
  }
  try {
    const storagePrefix = `flc:${prefix}`
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i)
      if (storageKey?.startsWith(storagePrefix)) keys.push(storageKey)
    }
    keys.forEach((storageKey) => localStorage.removeItem(storageKey))
  } catch {
    // Ignore storage access errors.
  }
}

export function writeProfile(userId: string, profile: User) {
  writeView(`${userId}:profile`, profile)
  window.dispatchEvent(new Event('flc-profile'))
}

const profileFlights = new Map<string, Promise<User | null>>()

export function prefetchUser(userId: string, force = false): Promise<User | null> {
  if (!force) {
    const existing = profileFlights.get(userId)
    if (existing) return existing
  }
  const flight = Promise.resolve(
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
  ).then(({ data }) => {
    const profile = (data as User | null) ?? null
    if (profile) writeProfile(userId, profile)
    return profile
  })
  profileFlights.set(userId, flight)
  const forget = () => {
    window.setTimeout(() => {
      if (profileFlights.get(userId) === flight) profileFlights.delete(userId)
    }, 3000)
  }
  flight.then(forget, forget)
  return flight
}

const leagueFlights = new Map<string, Promise<any[]>>()

export function startLeaguesQuery(userId: string): Promise<any[]> {
  const existing = leagueFlights.get(userId)
  if (existing) return existing
  const flight = Promise.resolve(
    supabase
      .from('leagues')
      .select('*')
      .contains('member_ids', [userId])
      .order('start_date', { ascending: true })
  ).then(({ data, error }) => {
    if (error) throw error
    return data || []
  })
  leagueFlights.set(userId, flight)
  flight.then(
    () => window.setTimeout(() => {
      if (leagueFlights.get(userId) === flight) leagueFlights.delete(userId)
    }, 4000),
    () => {
      if (leagueFlights.get(userId) === flight) leagueFlights.delete(userId)
    },
  )
  return flight
}

export function warmAccount(userId: string) {
  void prefetchUser(userId)
  void startLeaguesQuery(userId).catch(() => undefined)
}
