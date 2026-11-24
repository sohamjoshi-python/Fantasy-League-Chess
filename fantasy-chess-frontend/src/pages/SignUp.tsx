import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Eye, EyeOff, CheckCircle, ChevronRight, ChevronDown } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { getBrandName } from '../utils/browserDetection';
import { publicErrorMessage } from '../lib/publicError';
import { safeJoinNext } from '../lib/leagueJoinLink';
import { trackSignUp } from '../lib/googleAnalytics';

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const { signUp, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = safeJoinNext(searchParams.get('next'))

  // Redirect authenticated users only when not showing signup success
  useEffect(() => {
    if (user && !success) {
      navigate(nextPath || '/join-league')
    }
  }, [user, navigate, success, nextPath])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
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
      const result = await signUp(email, password, displayName.trim())
      trackSignUp()
      if (result.needsEmailConfirmation) {
        setSuccess(true)
      } else {
        navigate(nextPath || '/join-league')
      }
    } catch (error: any) {
      setError(publicErrorMessage(error, 'Failed to create account'))
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
              Check your email and open the confirmation link. It takes you straight to Join a League.
            </p>
            <p className="text-sm text-neutral-600">
              You can close this page. The link signs you in.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
            <img src={logo} alt="FLC Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-2 font-serif drop-shadow">Create Account</h1>
          <p className="text-neutral-700">Join {getBrandName()} and start your fantasy chess journey!</p>
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

        {/* Main Content Area - Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-neutral-900 mb-2">
                  Display Name
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
                    placeholder="At least 6 characters"
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
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-neutral-700">
                Already have an account?{' '}
                <button
                  onClick={() => navigate(nextPath ? `/signin?next=${encodeURIComponent(nextPath)}` : '/signin')}
                  className="text-royalBlue hover:text-blue-700 font-semibold"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>

          {/* Right Side - Information & Terms */}
          <div className="space-y-6">
            {/* Account Benefits */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Why Join {getBrandName()}?</h3>
              <ul className="space-y-3 text-blue-800">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Compete in fantasy chess leagues with real players</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Earn points and climb leaderboards</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Trade players in the marketplace</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span>Join tournaments and win prizes</span>
                </li>
              </ul>
            </div>

            {/* Terms and Privacy - Collapsible */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-200">
              <button
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold text-neutral-900">Terms & Privacy</h3>
                {showTerms ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
              </button>
              
              {showTerms && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-4">
                    By creating an account, you agree to our terms and privacy policy.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate('/tos')}
                      className="text-royalBlue hover:text-blue-700 text-sm block w-full text-left"
                    >
                      Terms of Service
                    </button>
                    <button
                      onClick={() => navigate('/privacy')}
                      className="text-royalBlue hover:text-blue-700 text-sm block w-full text-left"
                    >
                      Privacy Policy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp 