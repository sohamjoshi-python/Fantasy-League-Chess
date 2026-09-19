import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { buyAvatar, equipAvatar, fetchAvatarsForUser, ShopAvatar } from '../lib/avatars'

type AvatarShopProps = {
  onClose?: () => void
  onBalanceChange?: () => void
}

const AvatarShop: React.FC<AvatarShopProps> = ({ onClose, onBalanceChange }) => {
  const { user } = useAuth()
  const [avatars, setAvatars] = useState<ShopAvatar[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setError('')
    try {
      const list = await fetchAvatarsForUser(user.id)
      setAvatars(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load avatars')
      setAvatars([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleBuy = async (avatar: ShopAvatar) => {
    if (!user || avatar.owned) return
    setBusyId(avatar.id)
    setError('')
    try {
      await buyAvatar(user.id, avatar.id)
      setAvatars((current) =>
        current.map((item) => (item.id === avatar.id ? { ...item, owned: true } : item))
      )
      onBalanceChange?.()
    } catch (e) {
      setError((e instanceof Error ? e.message : 'Purchase failed').replace(/coins/gi, 'gems'))
    } finally {
      setBusyId(null)
    }
  }

  const handleEquip = async (avatar: ShopAvatar) => {
    if (!user || !avatar.owned) return
    setBusyId(avatar.id)
    setError('')
    try {
      await equipAvatar(user.id, avatar.id)
      setAvatars((current) =>
        current.map((item) => ({
          ...item,
          equipped: item.id === avatar.id,
        }))
      )
      onBalanceChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not equip avatar')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-neutral-900">Avatar Shop</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-600 mb-4">
        Spend gems on profile avatars. Equipped avatars appear on leaderboards and standings.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading avatars...</p>
      ) : avatars.length === 0 ? (
        <p className="text-neutral-500">No avatars available yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`rounded-lg border-2 p-3 flex flex-col items-center ${
                avatar.equipped ? 'border-royalBlue bg-blue-50' : 'border-neutral-200'
              }`}
            >
              <img
                src={avatar.image_url}
                alt={avatar.name}
                className="w-16 h-16 rounded-full object-cover border border-gold mb-2"
              />
              <p className="text-sm font-semibold text-neutral-900 text-center">{avatar.name}</p>
              <p className="text-xs text-neutral-500 mb-2">{avatar.price} gems</p>
              {avatar.equipped ? (
                <span className="text-xs font-medium text-royalBlue">Equipped</span>
              ) : avatar.owned ? (
                <button
                  type="button"
                  disabled={busyId === avatar.id}
                  onClick={() => handleEquip(avatar)}
                  className="w-full mt-1 bg-royalBlue hover:bg-blue-700 text-white text-xs py-1.5 rounded font-medium disabled:opacity-50"
                >
                  Equip
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyId === avatar.id}
                  onClick={() => handleBuy(avatar)}
                  className="w-full mt-1 bg-[#1e293b] hover:bg-royalBlue text-white text-xs py-1.5 rounded font-medium disabled:opacity-50"
                >
                  Buy
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AvatarShop
