import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Eye, EyeOff, CheckCircle, Mail } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { getBrandName } from '../utils/browserDetection'
import { supabase } from '../lib/supabase'

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resetRequestTime, setResetRequestTime] = useState<string>('')

  const { signIn } = useAuth()
  const navigate = useNavigate()

  // Check for error in URL hash (from expired/invalid reset links)
  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.substring(1))
      const errorParam = params.get('error')
      const errorDescription = params.get('error_description')
      
      if (errorParam === 'access_denied' && errorDescription) {
        const message = errorDescription.replace(/\+/g, ' ')
        setError(message)
        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1000)
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.trim()) {
      setError('Please enter your email address')
      setLoading(false)
      return
    }

    try {
      // Use production URL if in production, otherwise use current origin
      const isProduction = window.location.hostname === 'fantasyleaguechess.com' || 
                          window.location.hostname === 'www.fantasyleaguechess.com'
      const redirectUrl = isProduction 
        ? 'https://fantasyleaguechess.com/reset-password'
        : `${window.location.origin}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })
      
      // Note: Supabase will send an email with a link that includes a recovery token
      // The link format will be: redirectUrl#access_token=...&type=recovery
      // This tells our app to show the password reset form

      if (error) throw error

      // Record the time the request was made
      const now = new Date()
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      })
      setResetRequestTime(timeString)
      setResetEmailSent(true)
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
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
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome Back!</h2>
            <p className="text-neutral-700 mb-4">
              Redirecting to your dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (showForgotPassword) {
    if (resetEmailSent) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center py-10">
          <div className="max-w-md w-full mx-auto px-4">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <Mail className="w-16 h-16 mx-auto mb-4 text-blue-500" />
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Check Your Email</h2>
              <p className="text-neutral-700 mb-2">
                We've sent a password reset link to <strong>{email}</strong>.
              </p>
              {resetRequestTime && (
                <p className="text-sm text-gray-600 mb-4">
                  📬 Email sent at <strong>{resetRequestTime}</strong>
                </p>
              )}
              <p className="text-neutral-700 mb-4">
                Click the link in the email to open the password reset page where you can set a new password.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>⏱️ Important:</strong> The reset link expires in 1 hour.
                </p>
                <p className="text-sm text-yellow-800">
                  Each request generates a NEW unique link. If you requested multiple times, use the MOST RECENT email.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>💡 Tips:</strong>
                </p>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                  <li>• Check your spam/junk folder</li>
                  <li>• Wait a few minutes for email to arrive</li>
                  <li>• Look for the email with timestamp: {resetRequestTime}</li>
                  <li>• If multiple emails, use the newest one</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setResetEmailSent(false)
                    setError('')
                  }}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                >
                  🔄 Didn't Receive? Send Another Link
                </button>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetEmailSent(false)
                  }}
                  className="text-royalBlue hover:text-blue-700 font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
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
            <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 font-serif drop-shadow">Reset Password</h1>
            <p className="text-neutral-700">Enter your email to receive a password reset link</p>
          </div>

          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Sign In
            </button>
          </div>

          {/* Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-neutral-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                  placeholder="Enter your email"
                  required
                />
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
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
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 font-serif drop-shadow">Sign In</h1>
          <p className="text-neutral-700">Welcome back to {getBrandName()}!</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                  placeholder="Enter your password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-royalBlue hover:text-blue-700 font-semibold"
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                <p className="text-red-700 font-semibold mb-2">{error}</p>
                {error.includes('expired') && (
                  <p className="text-sm text-red-600">
                    Your password reset link has expired. Please request a new one using the "Forgot Password?" link below.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-royalBlue hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-neutral-700">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-royalBlue hover:text-blue-700 font-semibold"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignIn

