import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { sendWelcomeEmail } from '../lib/resend-email'

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

// Helper function to send welcome email using Resend
const sendWelcomeEmailFree = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await sendWelcomeEmail(email)
    return { success: result.success, error: result.error }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

const welcomeEmailInFlight = new Set<string>()

// Helper function to check if welcome email should be sent and send it
const checkAndSendWelcomeEmail = async (user: User) => {
  if (!user.email || !user.email_confirmed_at) return
  if (welcomeEmailInFlight.has(user.id)) return
  welcomeEmailInFlight.add(user.id)

  try {
    const createdAt = new Date(user.created_at)
    const confirmedAt = new Date(user.email_confirmed_at)
    const hoursDiff = (confirmedAt.getTime() - createdAt.getTime()) / (1000 * 3600)
    if (hoursDiff >= 1) return

    const { data: claimed, error: claimError } = await supabase
      .from('users')
      .update({ sent_welcome_email: true })
      .eq('id', user.id)
      .or('sent_welcome_email.eq.false,sent_welcome_email.is.null')
      .select('id')
      .maybeSingle()

    if (claimError || !claimed) return

    const result = await sendWelcomeEmailFree(user.email)
    if (!result.success) {
      await supabase
        .from('users')
        .update({ sent_welcome_email: false })
        .eq('id', user.id)
    }
  } catch (error) {
    // Silent error handling for production
  } finally {
    welcomeEmailInFlight.delete(user.id)
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
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
      // Handle different auth events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null)
        setLoading(false)
      }
      
      // Send welcome email when user confirms their email (SIGNED_IN after email confirmation)
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        // Check if welcome email has already been sent for this user
        checkAndSendWelcomeEmail(session.user)
      }
      
      // Handle password recovery - user clicked reset link from email
      if (event === 'PASSWORD_RECOVERY') {
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
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })
      
      if (error) {
        throw error
      }

      // Insert user into public.users table immediately after signup.
      // ignoreDuplicates so a concurrent SIGNED_IN claim cannot be reset to false.
      if (data.user) {
        try {
          const { error: insertError } = await supabase.from('users').upsert({
            id: data.user.id,
            username: displayName,
            email: data.user.email,
            coins: 1000, // Starting coins
            sent_welcome_email: false,
            created_at: new Date().toISOString()
          }, { onConflict: 'id', ignoreDuplicates: true })
          
          if (insertError) {
            // Don't throw error - user can still use the app
          }
        } catch (insertError) {
          // Don't throw error - user can still use the app
        }

        if (data.session?.user?.email_confirmed_at) {
          await checkAndSendWelcomeEmail(data.session.user)
        }
      }

    } catch (error) {
      throw error
    }
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
