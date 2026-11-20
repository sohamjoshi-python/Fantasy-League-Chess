import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { peekPendingJoinPath, PENDING_JOIN_KEY } from '../lib/leagueJoinLink'

const NewUserRedirect: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (location.pathname === '/reset-password') return
      if (location.pathname.startsWith('/join/')) {
        if (user) sessionStorage.removeItem(PENDING_JOIN_KEY)
        return
      }
      const pendingJoin = peekPendingJoinPath()
      if (user && pendingJoin && location.pathname !== pendingJoin) {
        navigate(pendingJoin)
        return
      }
      if (user && !hasChecked) {
        try {
          // Check if user has been redirected to tutorial before
          const tutorialRedirected = localStorage.getItem(`tutorial_redirected_${user.id}`)
          
          if (!tutorialRedirected) {
            // Check if user has any leagues (indicating they're not completely new)
            const { data: userLeagues } = await supabase
              .from('leagues')
              .select('id')
              .contains('member_ids', [user.id])
              .limit(1)

            // If user has no leagues, they're new and should see tutorial
            if (!userLeagues || userLeagues.length === 0) {
              // Mark as redirected and navigate to tutorial
              localStorage.setItem(`tutorial_redirected_${user.id}`, 'true')
              navigate('/tutorial')
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error)
        } finally {
          setHasChecked(true)
        }
      }
    }

    checkAndRedirect()
  }, [user, navigate, hasChecked, location.pathname])

  return null // This component doesn't render anything
}

export default NewUserRedirect 