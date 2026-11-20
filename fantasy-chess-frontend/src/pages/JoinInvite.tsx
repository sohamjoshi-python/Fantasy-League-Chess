import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Calendar, Trophy, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { League } from '../types'
import { formatCalendarDate, isLeagueJoinClosed } from '../lib/leagueStatus'
import { publicErrorMessage } from '../lib/publicError'
import { isJoinCode, leagueJoinPath, PENDING_JOIN_KEY, rememberJoinPath } from '../lib/leagueJoinLink'

const JoinInvite: React.FC = () => {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [league, setLeague] = useState<League | null>(null)
  const [loadingLeague, setLoadingLeague] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const validCode = isJoinCode(code)
  const invitePath = validCode ? leagueJoinPath(code) : '/join-league'

  useEffect(() => {
    if (!validCode || user) return
    rememberJoinPath(invitePath)
  }, [invitePath, validCode, user])

  useEffect(() => {
    if (!user || !validCode) return

    let cancelled = false
    const load = async () => {
      setLoadingLeague(true)
      setError('')
      const { data, error: lookupError } = await supabase.rpc('lookup_league_by_join_code', {
        p_join_code: code.trim().toUpperCase(),
      })
      if (cancelled) return
      if (lookupError) {
        setError(publicErrorMessage(lookupError, 'Could not open this invite.'))
        setLeague(null)
      } else {
        const row = Array.isArray(data) ? data[0] : data
        setLeague((row as League) || null)
        if (!row) setError('This invite link does not match a league.')
      }
      setLoadingLeague(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user, validCode, code])

  const joinLeague = async () => {
    if (!user || !league) return
    setJoining(true)
    setError('')
    try {
      if (isLeagueJoinClosed(league)) {
        setError('You cannot join a league that is in progress or has already started.')
        return
      }
      if ((league.member_ids || []).includes(user.id)) {
        navigate(`/league/${league.id}`)
        return
      }
      const maxMembers = league.max_members || 10
      if ((league.member_ids || []).length >= maxMembers) {
        setError(`League is full (${league.member_ids.length}/${maxMembers} members)`)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('coins')
        .eq('id', user.id)
        .single()

      if (!userData || userData.coins < league.buy_in) {
        setError('You don\'t have enough gems for this league')
        return
      }

      const { data, error: joinError } = await supabase.rpc('join_league_atomic', {
        p_league_id: league.id,
      })
      if (joinError) throw joinError
      const result = data as { success?: boolean; error?: string }
      if (!result?.success) throw new Error(result?.error || 'Failed to join league')

      if (user.email) {
        void supabase.functions.invoke('send-email', {
          body: {
            to: user.email,
            subject: `Welcome to ${league.name}!`,
            text: `You have successfully joined ${league.name}. Get ready to draft players and compete!`,
          },
        })
      }

      sessionStorage.removeItem(PENDING_JOIN_KEY)
      navigate(`/league/${league.id}`)
    } catch (joinFailure) {
      setError(publicErrorMessage(joinFailure, 'Failed to join league'))
    } finally {
      setJoining(false)
    }
  }

  if (!validCode) {
    return (
      <div className="w-full max-w-lg mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Invite link not valid</h1>
          <p className="text-neutral-600 mb-4">Ask the league creator for a new link.</p>
          <Link to="/join-league" className="text-royalBlue font-semibold">Browse leagues</Link>
        </div>
      </div>
    )
  }

  if (authLoading || (user && loadingLeague)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-royalBlue" />
      </div>
    )
  }

  if (!user) {
    const next = encodeURIComponent(invitePath)
    return (
      <div className="w-full max-w-lg mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">You're invited to a league</h1>
          <p className="text-neutral-600 mb-6">
            Sign in to see the league and join. New accounts start with 1000 gems.
          </p>
          <div className="space-y-3">
            <Link
              to={`/signin?next=${next}`}
              className="block w-full bg-royalBlue hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg"
            >
              Sign in to join
            </Link>
            <Link
              to={`/signup?next=${next}`}
              className="block w-full border-2 border-royalBlue text-royalBlue hover:bg-royalBlue hover:text-white font-medium py-3 px-6 rounded-lg"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const alreadyMember = !!league && (league.member_ids || []).includes(user.id)
  const maxMembers = league?.max_members || 10
  const isFull = !!league && (league.member_ids || []).length >= maxMembers
  const joinClosed = !!league && isLeagueJoinClosed(league)

  return (
    <div className="w-full max-w-lg mx-auto p-4 lg:p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-royalBlue">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          {league ? league.name : 'League invite'}
        </h1>
        {league?.description && (
          <p className="text-neutral-600 text-sm mb-4">{league.description}</p>
        )}
        {league && (
          <div className="space-y-2 mb-6">
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Users className="h-4 w-4 text-royalBlue" />
              <span>{league.member_ids.length}/{maxMembers} members</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Trophy className="h-4 w-4 text-royalBlue" />
              <span>{league.buy_in} gems buy-in</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Calendar className="h-4 w-4 text-royalBlue" />
              <span>Starts {formatCalendarDate(league.start_date)}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        {league && alreadyMember ? (
          <button
            type="button"
            onClick={() => navigate(`/league/${league.id}`)}
            className="w-full bg-[#1e293b] hover:bg-royalBlue text-white py-3 px-4 rounded-lg font-semibold"
          >
            Open league
          </button>
        ) : league ? (
          <button
            type="button"
            disabled={joining || isFull || joinClosed}
            onClick={() => void joinLeague()}
            className="w-full bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-3 px-4 rounded-lg font-semibold"
          >
            {joining ? 'Joining...' : isFull ? 'League full' : joinClosed ? 'Closed' : `Join for ${league.buy_in} gems`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default JoinInvite
