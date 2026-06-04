import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import AvatarShop from '../components/AvatarShop'
import fantasyLeagueChessLogo from '../assets/fantasy-league-chess-logo-updated.png'

interface ProfileProps {
  showOnlyShop?: boolean;
  onCloseShop?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ showOnlyShop = false, onCloseShop }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      loadProfile()
    } else {
      setLoading(false)
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
      <div className="w-full max-w-4xl mx-auto pt-24 px-4 pb-12">
        <AvatarShop onClose={onCloseShop} onBalanceChange={loadProfile} />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto pt-24 px-4 pb-12">
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={profile?.selected_avatar_url || fantasyLeagueChessLogo}
              alt=""
              className="w-16 h-16 rounded-full border-2 border-gold object-cover"
            />
            <h2 className="text-2xl font-bold text-neutral-900">Profile Settings</h2>
          </div>
          <Link
            to="/avatar-shop"
            className="inline-flex justify-center bg-royalBlue hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
          >
            Avatar Shop
          </Link>
        </div>

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
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 text-sm lg:text-base"
              placeholder="Enter your username"
            />
            <p className="text-xs text-neutral-500 mt-1">This is your display name that will appear in leagues and leaderboards</p>
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
    </div>
  )
}

export default Profile
