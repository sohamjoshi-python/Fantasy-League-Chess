import * as React from 'react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import pawnRoyaleLogo from '../assets/pawn-royale-logo.png';

type Avatar = {
  id: string;
  name: string;
  image_url: string;
  price: number;
  owned: boolean;
};

interface ProfileProps {
  showOnlyShop?: boolean;
  onCloseShop?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ showOnlyShop = false, onCloseShop }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showAvatarShop, setShowAvatarShop] = useState(false)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single()
    if (data) {
      setProfile(data)
      setUsername(data.username || '')
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    // Check if username is already taken (by another user)
    if (username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id)
        .single()
      if (existing) {
        setMessage('That username is already taken. Please choose another.');
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', user?.id)
    if (!error) {
      setMessage('Profile updated!')
      loadProfile()
    } else if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
      setMessage('That username is already taken. Please choose another.')
    } else {
      setMessage('Error updating profile')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  if (showOnlyShop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <AvatarShop user={profile!} onClose={onCloseShop || (() => {})} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 lg:p-8 mt-4 lg:mt-8 border-2 border-royalBlue">
      <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-neutral-900">Profile</h1>
      {/* Use profile for all profile fields and avatar display */}
      <img src={profile?.selected_avatar_url || pawnRoyaleLogo} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-royalBlue mb-4" />
      {profile && <button onClick={() => setShowAvatarShop(true)} className="bg-royalBlue text-white px-4 py-2 rounded-lg mb-2">Change Avatar</button>}
      <a href="/avatar-shop" className="block text-royalBlue underline mb-2">Go to Avatar Shop</a>
      <a href="/leaderboard" className="block text-royalBlue underline mb-4">View Leaderboard</a>
      {showAvatarShop && profile && <AvatarShop user={profile} onClose={() => setShowAvatarShop(false)} />}
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
          <input
            type="text"
            value={profile?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-100 text-neutral-500 text-sm lg:text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Username</label>
          <input
            type="text"
            value={profile?.username || ''}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 text-sm lg:text-base"
            placeholder="Enter your username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Coins</label>
          <input
            type="text"
            value={profile?.coins ?? 0}
            disabled
            className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-100 text-neutral-900 text-sm lg:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#1e293b] hover:bg-royalBlue text-white py-2 px-4 rounded-md font-semibold text-sm lg:text-base shadow-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {message && <div className="text-green-600 text-center text-sm lg:text-base">{message}</div>}
      </form>
    </div>
  )
}

const SUPABASE_EDGE_BASE = 'https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function fetchAvatars(userId: string): Promise<Avatar[]> {
  try {
    const res = await fetch(`${SUPABASE_EDGE_BASE}/fetch-avatars`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    if (!res.ok) {
      return [];
    }
    return await res.json();
  } catch (e) {
    return [];
  }
}
async function buyAvatar(userId: string, avatarId: string) {
  const res = await fetch(`${SUPABASE_EDGE_BASE}/buy-avatar`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, avatar_id: avatarId }),
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  return await res.json();
}
async function equipAvatar(userId: string, avatarId: string) {
  const res = await fetch(`${SUPABASE_EDGE_BASE}/equip-avatar`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, avatar_id: avatarId }),
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
  });
  return await res.json();
}

const AvatarShop: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAvatars(user.id).then((data) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        setError('Could not load avatars. Please try again later.');
      } else {
        setAvatars(data);
        setError('');
      }
    });
  }, [user.id]);

  const handleBuy = async (avatar: Avatar) => {
    const res = await buyAvatar(user.id, avatar.id);
    if (res.error) setError(res.error);
    else setAvatars(await fetchAvatars(user.id));
  };

  const handleEquip = async (avatar: Avatar) => {
    const res = await equipAvatar(user.id, avatar.id);
    if (res.error) setError(res.error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-neutral-500">✕</button>
        <h3 className="text-lg font-bold mb-4">Avatar Shop</h3>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {!error && (
          <div className="grid grid-cols-3 gap-4">
            {avatars.map(avatar => (
              <div key={avatar.id} className="flex flex-col items-center">
                <img src={avatar.image_url || pawnRoyaleLogo} alt={avatar.name} className="w-16 h-16 rounded-full border mb-2" />
                <div className="text-xs mb-1">{avatar.name}</div>
                {avatar.owned ? (
                  <button onClick={() => handleEquip(avatar)} className="text-xs bg-royalBlue text-white px-2 py-1 rounded">Equip</button>
                ) : (
                  <button onClick={() => handleBuy(avatar)} className="text-xs bg-gold text-white px-2 py-1 rounded" disabled={user.coins < avatar.price}>Buy ({avatar.price} coins)</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile 
