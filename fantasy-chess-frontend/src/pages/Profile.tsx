import * as React from 'react'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { User } from '../types'

const Profile: React.FC = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
    const { error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', user?.id)
    if (!error) {
      setMessage('Profile updated!')
      loadProfile()
    } else {
      setMessage('Error updating profile')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-lg p-6 lg:p-8 mt-4 lg:mt-8 border-2 border-gold">
      <h1 className="text-xl lg:text-2xl font-bold mb-4 lg:mb-6 text-neutral-900">Profile</h1>
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
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold text-neutral-900 text-sm lg:text-base"
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
          className="w-full bg-[#1e293b] hover:bg-gold text-white py-2 px-4 rounded-md font-semibold text-sm lg:text-base shadow-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {message && <div className="text-green-600 text-center text-sm lg:text-base">{message}</div>}
      </form>
    </div>
  )
}

export default Profile 
