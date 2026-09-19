import { supabase } from './supabase'
import fallbackLogo from '../assets/fantasy-league-chess-logo-updated.png'
import pawnAvatar from '../assets/avatars/pawn.svg'
import bishopAvatar from '../assets/avatars/bishop.svg'
import knightAvatar from '../assets/avatars/knight.svg'
import rookAvatar from '../assets/avatars/rook.svg'
import queenAvatar from '../assets/avatars/queen.svg'
import kingAvatar from '../assets/avatars/king.svg'

export type ShopAvatar = {
  id: string
  name: string
  image_url: string
  price: number
  owned: boolean
  equipped: boolean
}

const BUNDLED_AVATARS: Record<string, string> = {
  pawn: pawnAvatar,
  bishop: bishopAvatar,
  knight: knightAvatar,
  rook: rookAvatar,
  queen: queenAvatar,
  king: kingAvatar,
}

type RpcResult = {
  success?: boolean
  error?: string
}

function throwIfRpcFailed(data: RpcResult | null, error: { message?: string } | null, fallback: string) {
  if (error) {
    throw new Error(humanizeAvatarError(error.message || fallback))
  }
  if (data && data.success === false) {
    throw new Error(humanizeAvatarError(data.error || fallback))
  }
}

function humanizeAvatarError(message: string) {
  if (/schema cache|does not exist|could not find the table|could not find the function/i.test(message)) {
    return 'Avatar shop is not set up yet. Apply the latest database migration and try again.'
  }
  return message
}

export function resolveAvatarUrl(imageUrl?: string | null, name?: string | null): string {
  if (
    imageUrl &&
    (imageUrl.startsWith('data:') ||
      imageUrl.startsWith('blob:') ||
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://'))
  ) {
    return imageUrl
  }

  const fromPath = imageUrl?.split('/').pop()?.replace(/\.svg$/i, '').toLowerCase()
  if (fromPath && BUNDLED_AVATARS[fromPath]) {
    return BUNDLED_AVATARS[fromPath]
  }

  const fromName = name?.trim().toLowerCase()
  if (fromName && BUNDLED_AVATARS[fromName]) {
    return BUNDLED_AVATARS[fromName]
  }

  return imageUrl || fallbackLogo
}

export async function fetchAvatarsForUser(userId: string): Promise<ShopAvatar[]> {
  const [{ data: avatars, error: avatarsError }, { data: userAvatars, error: ownershipError }] =
    await Promise.all([
      supabase
        .from('avatars')
        .select('id, name, image_url, price')
        .order('price', { ascending: true }),
      supabase
        .from('user_avatars')
        .select('avatar_id, owned, equipped')
        .eq('user_id', userId),
    ])

  if (avatarsError) {
    throw new Error(humanizeAvatarError(avatarsError.message || 'Could not load avatars'))
  }
  if (ownershipError) {
    throw new Error(humanizeAvatarError(ownershipError.message || 'Could not load owned avatars'))
  }

  const ownedIds = new Set(
    (userAvatars ?? []).filter((row) => row.owned).map((row) => String(row.avatar_id))
  )
  const equippedId = (userAvatars ?? []).find((row) => row.equipped)?.avatar_id

  return (avatars ?? []).map((avatar) => ({
    id: String(avatar.id),
    name: avatar.name,
    image_url: resolveAvatarUrl(avatar.image_url, avatar.name),
    price: Number(avatar.price) || 0,
    owned: ownedIds.has(String(avatar.id)),
    equipped: equippedId != null && String(avatar.id) === String(equippedId),
  }))
}

export async function buyAvatar(_userId: string, avatarId: string): Promise<void> {
  const { data, error } = await supabase.rpc('buy_avatar', { p_avatar_id: avatarId })
  throwIfRpcFailed(data as RpcResult | null, error, 'Purchase failed')
}

export async function equipAvatar(_userId: string, avatarId: string): Promise<void> {
  const { data, error } = await supabase.rpc('equip_avatar', { p_avatar_id: avatarId })
  throwIfRpcFailed(data as RpcResult | null, error, 'Could not equip avatar')
}
