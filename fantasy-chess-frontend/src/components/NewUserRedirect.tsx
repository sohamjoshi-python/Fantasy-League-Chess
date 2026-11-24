import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { peekPendingJoinPath, PENDING_JOIN_KEY } from '../lib/leagueJoinLink'

const NewUserRedirect: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/reset-password') return
    if (location.pathname.startsWith('/join/')) {
      if (user) sessionStorage.removeItem(PENDING_JOIN_KEY)
      return
    }
    const pendingJoin = peekPendingJoinPath()
    if (user && pendingJoin && location.pathname !== pendingJoin) {
      navigate(pendingJoin)
    }
  }, [user, navigate, location.pathname])

  return null // This component doesn't render anything
}

export default NewUserRedirect 