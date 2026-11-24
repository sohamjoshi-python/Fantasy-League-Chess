import { lazy, Suspense } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { peekPendingJoinPath } from '../lib/leagueJoinLink'
import { LoadingSpinner } from './ui/LoadingSpinner'

const Home = lazy(() => import('../pages/Home'))

/** Signed-in visits to the front page go to the dashboard. Everyone else sees the intro. */
const AuthRedirect = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={peekPendingJoinPath() || '/dashboard'} replace />
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>}>
      <Home />
    </Suspense>
  )
}

export default AuthRedirect
