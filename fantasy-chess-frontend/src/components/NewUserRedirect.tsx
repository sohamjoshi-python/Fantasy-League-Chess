import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const NewUserRedirect: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user && !hasChecked) {
        try {
          // Check if user has been redirected to help page before
          const helpRedirected = localStorage.getItem(`help_redirected_${user.id}`)
          
          if (!helpRedirected) {
            // Check if user has any leagues (indicating they're not completely new)
            const { data: userLeagues } = await supabase
              .from('leagues')
              .select('id')
              .contains('member_ids', [user.id])
              .limit(1)

            // If user has no leagues, they're new and should see help
            if (!userLeagues || userLeagues.length === 0) {
              // Mark as redirected and navigate to help
              localStorage.setItem(`help_redirected_${user.id}`, 'true')
              navigate('/help')
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
  }, [user, navigate, hasChecked])

  return null // This component doesn't render anything
}

export default NewUserRedirect 