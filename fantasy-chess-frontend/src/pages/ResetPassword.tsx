import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { supabase } from '../lib/supabase'

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const navigate = useNavigate()

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Check for error in URL hash (from expired/invalid links)
    const hash = window.location.hash
    console.log('Reset password page loaded, hash:', hash)
    
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')
      const typeParam = params.get('type')
      const accessToken = params.get('access_token')
      
      console.log('URL params:', { errorParam, typeParam, hasAccessToken: !!accessToken })
      
      if (errorParam === 'access_denied' && errorDescription) {
        const message = errorDescription.replace(/\+/g, ' ')
        setError(message)
        setIsValidSession(false)
        setCheckingSession(false)
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      
      // Check if this is a recovery/password reset link
      if (typeParam === 'recovery' && accessToken) {
        console.log('✅ Recovery link detected with access token')
        // Give Supabase a moment to process the token and set up the session
        timeoutId = setTimeout(() => {
          checkSession()
        }, 500)
        return
      }
    }

    // If no hash params, check session immediately
    checkSession()

    // Check if user has a valid recovery session
    async function checkSession() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('Session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          error: sessionError 
        })
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setIsValidSession(false)
          setError('Invalid or expired reset link. Please request a new password reset.')
          setCheckingSession(false)
          return
        }
        
        // Check if this is a valid session from the recovery email
        if (session && session.user) {
          console.log('✅ Valid recovery session found for user:', session.user.email)
          setIsValidSession(true)
        } else {
          console.log('❌ No valid session found')
          setIsValidSession(false)
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      } catch (err) {
        console.error('Error checking session:', err)
        setIsValidSession(false)
        setError('Error validating reset link. Please try again.')
      }
      
      setCheckingSession(false)
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      // Sign out the user so they have to log in with the new password
      // This ensures the password was actually changed and prevents auto-login with recovery token
      await supabase.auth.signOut()

      setSuccess(true)
      setTimeout(() => {
        navigate('/signin')
      }, 2500)
    } catch (error: any) {
      setError(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-royalBlue"></div>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Password Reset Link Expired</h2>
            <p className="text-neutral-700 mb-4">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-800 mb-2">
                <strong>To reset your password:</strong>
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4">
                <li>1. Return to the Sign In page</li>
                <li>2. Click "Forgot Password?"</li>
                <li>3. Request a new reset link</li>
                <li>4. Click the link in your email within 1 hour</li>
              </ol>
            </div>
            <button
              onClick={() => navigate('/signin')}
              className="px-6 py-3 bg-royalBlue hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              Go to Sign In & Request New Link
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center py-10">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Password Reset Successful!</h2>
            <p className="text-neutral-700 mb-4">
              Your password has been successfully changed.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-green-800">
                <strong>✓ What's Next:</strong><br/>
                You'll be redirected to the sign-in page where you can log in with your NEW password.
              </p>
            </div>
            <p className="text-sm text-neutral-600">
              Redirecting to sign in...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 font-serif drop-shadow">Reset Your Password</h1>
          <p className="text-neutral-700">Enter your new password below</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-900 mb-2">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-900 mb-2">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-royalBlue hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          {/* Back to Sign In Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/signin')}
              className="text-neutral-700 hover:text-neutral-900"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword

