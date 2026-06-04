import { supabase } from './supabase'

export type ShopAvatar = {
  id: string
  name: string
  image_url: string
  price: number
  owned: boolean
  equipped: boolean
}

export async function fetchAvatarsForUser(userId: string): Promise<ShopAvatar[]> {
  const { data, error } = await supabase.functions.invoke('fetch-avatars', {
    body: { user_id: userId },
  })
  if (error) throw error
  if (Array.isArray(data)) return data as ShopAvatar[]
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ShopAvatar[]
    } catch {
      return []
    }
  }
  return (data as ShopAvatar[]) ?? []
}

export async function buyAvatar(userId: string, avatarId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('buy-avatar', {
    body: { user_id: userId, avatar_id: avatarId },
  })
  if (error) throw error
  const parsed = typeof data === 'string' ? JSON.parse(data) : data
  if (parsed?.error) throw new Error(parsed.error)
}

export async function equipAvatar(userId: string, avatarId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('equip-avatar', {
    body: { user_id: userId, avatar_id: avatarId },
  })
  if (error) throw error
  const parsed = typeof data === 'string' ? JSON.parse(data) : data
  if (parsed?.error) throw new Error(parsed.error)
}
