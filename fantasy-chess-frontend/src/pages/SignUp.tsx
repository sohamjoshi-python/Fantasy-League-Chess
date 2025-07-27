import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react'
import logo from '../assets/pawn-royale-logo.png'

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

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

    if (!displayName.trim()) {
      setError('Display name is required')
      setLoading(false)
      return
    }

    try {
      await signUp(email, password, displayName.trim())
      setSuccess(true)
      setTimeout(() => {
        navigate('/join-league')
      }, 2000)
    } catch (error: any) {
      setError(error.message || 'Failed to create account')
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
              <img src={logo} alt="Pawn Royale Logo" className="w-full h-full object-contain" />
            </div>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Account Created!</h2>
            <p className="text-neutral-700 mb-4">
              Welcome to Pawn Royale! Please check your email to verify your account.
            </p>
            <p className="text-sm text-neutral-600">
              Redirecting to join a league...
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
            <img src={logo} alt="Pawn Royale Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 font-serif drop-shadow">Create Account</h1>
          <p className="text-neutral-700">Join Pawn Royale and start your fantasy chess journey!</p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to How to Play
          </button>
        </div>

        {/* Sign Up Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-neutral-900 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                placeholder="Enter your display name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-900 mb-2">
                Email Address *
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
                Password *
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
              <p className="text-xs text-gray-600 mt-1">Must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-900 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-royalBlue focus:border-transparent transition-colors"
                  placeholder="Confirm your password"
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

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-royalBlue hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-neutral-700">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/signin')}
                className="text-royalBlue hover:text-blue-700 font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-600">
            By creating an account, you agree to our{' '}
            <button
              onClick={() => navigate('/tos')}
              className="text-royalBlue hover:text-blue-700"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              onClick={() => navigate('/privacy')}
              className="text-royalBlue hover:text-blue-700"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUp 