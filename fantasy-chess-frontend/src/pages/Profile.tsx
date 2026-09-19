import * as React from 'react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { resolveAvatarUrl } from '../lib/avatars'
import { User } from '../types'
import AvatarShop from '../components/AvatarShop'

interface ProfileProps {
  showOnlyShop?: boolean;
  onCloseShop?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ showOnlyShop = false, onCloseShop }) => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const { error } = await supabase.functions.invoke('delete-account')
      if (error) {
        throw error
      }
      // Account is gone; end the session and return to the landing page.
      await signOut().catch(() => {})
      navigate('/')
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again or contact support.')
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadProfile = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single()
    if (data) {
      setProfile(data)
      setUsername(data.username || '')
    }
    if (!silent) setLoading(false)
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

  if (showOnlyShop) {
    return (
      <div className="w-full max-w-4xl mx-auto pt-24 px-4 pb-12">
        <AvatarShop onClose={onCloseShop} onBalanceChange={() => loadProfile({ silent: true })} />
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto pt-24 px-4 pb-12">
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <img
              src={resolveAvatarUrl(profile?.selected_avatar_url)}
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
            <label className="block text-sm font-medium text-neutral-700 mb-2">Gems</label>
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

      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-red-300 mt-6">
        <h3 className="text-lg font-bold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteConfirmText('')
            setDeleteError('')
            setShowDeleteModal(true)
          }}
          className="inline-flex justify-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        >
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Delete your account?</h3>
            <p className="text-sm text-neutral-600 mb-4">
              This will permanently remove your profile, teams, lineups, and league memberships.
              This action <span className="font-semibold">cannot be undone</span>. Type{' '}
              <span className="font-mono font-semibold">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              disabled={deleting}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-neutral-900 text-sm lg:text-base mb-4"
            />
            {deleteError && <div className="text-red-600 text-sm mb-4">{deleteError}</div>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-md text-sm font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== 'DELETE'}
                className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
