import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { sendWelcomeEmail } from '../lib/free-email'

interface AuthContextType {
  user: User | null
  loading: boolean
  isNewUser: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to send welcome email using free service
const sendWelcomeEmailFree = async (email: string) => {
  try {
    const result = await sendWelcomeEmail(email)
    if (!result.success) {
      console.error('Error sending welcome email:', result.error)
    }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    // Don't throw error - email failure shouldn't prevent signup
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    // Get initial session
    setLoading(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    }).finally(() => setLoading(false))

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change event:', event)
      
      // Handle different auth events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null)
        setLoading(false)
      }
      
      // Handle password recovery - user clicked reset link from email
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected - user clicked reset link')
        // User has clicked the reset link and has a valid recovery session
        // The session is automatically set, just update our state
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    
    // Check if this is a new user by looking at their created_at timestamp
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      const createdAt = new Date(currentUser.created_at)
      const now = new Date()
      const timeDiff = now.getTime() - createdAt.getTime()
      const hoursDiff = timeDiff / (1000 * 3600)
      
      // If user was created within the last 24 hours, consider them new
      setIsNewUser(hoursDiff < 24)
    }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName }
      }
    })
    if (error) throw error

    // Send welcome email after successful signup
        await sendWelcomeEmailFree(email)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    isNewUser,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 
