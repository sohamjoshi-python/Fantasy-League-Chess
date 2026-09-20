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
const welcomeEmailHandled = new Set<string>()

const welcomeHandledKey = (userId: string) => `flc_welcome_email_${userId}`

const hasHandledWelcome = (userId: string) => {
  if (welcomeEmailHandled.has(userId)) return true
  try {
    if (sessionStorage.getItem(welcomeHandledKey(userId))) {
      welcomeEmailHandled.add(userId)
      return true
    }
  } catch {
    // sessionStorage can throw in private mode
  }
  return false
}

const markWelcomeHandled = (userId: string) => {
  welcomeEmailHandled.add(userId)
  try {
    sessionStorage.setItem(welcomeHandledKey(userId), '1')
  } catch {
    // sessionStorage can throw in private mode
  }
}

const claimWelcomeEmailSend = async (userId: string) => {
  // Do not use maybeSingle(): a 0-row PATCH is a 406 with that Accept header.
  const { data, error } = await supabase
    .from('users')
    .update({ sent_welcome_email: true })
    .eq('id', userId)
    .eq('sent_welcome_email', false)
    .select('id')

  if (error) {
    console.error('Welcome email claim failed:', error)
    return null
  }
  return data?.[0] ?? null
}

// Send once after email confirmation. The users.sent_welcome_email flag is the lock.
const checkAndSendWelcomeEmail = async (user: User) => {
  if (!user.email || !user.email_confirmed_at) return
  if (hasHandledWelcome(user.id) || welcomeEmailInFlight.has(user.id)) return
  welcomeEmailInFlight.add(user.id)

  try {
    let claimed = await claimWelcomeEmailSend(user.id)

    if (!claimed) {
      const { data: existing } = await supabase
        .from('users')
        .select('id, sent_welcome_email')
        .eq('id', user.id)
        .limit(1)

      if (existing?.[0]?.sent_welcome_email) {
        markWelcomeHandled(user.id)
        return
      }

      if (!existing?.[0]) {
        const displayName =
          (user.user_metadata?.display_name as string | undefined) ||
          (user.user_metadata?.username as string | undefined) ||
          user.email.split('@')[0]
        await supabase.from('users').upsert({
          id: user.id,
          username: displayName,
          email: user.email,
          coins: 1000,
          sent_welcome_email: false,
          created_at: user.created_at,
        }, { onConflict: 'id', ignoreDuplicates: true })
        claimed = await claimWelcomeEmailSend(user.id)
      }
    }

    if (!claimed) {
      markWelcomeHandled(user.id)
      return
    }

    const result = await sendWelcomeEmailFree(user.email)
    if (!result.success) {
      await supabase
        .from('users')
        .update({ sent_welcome_email: false })
        .eq('id', user.id)
      return
    }
    markWelcomeHandled(user.id)
  } catch (error) {
    console.error('Welcome email send failed:', error)
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
