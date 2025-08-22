import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, HelpCircle, Bell } from 'lucide-react'
import DiscordServerJoin from './DiscordServerJoin'
import { getUnreadNotificationCount, supabase } from '../lib/supabase'
import Inbox from './Inbox'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { useResponsiveBrandName } from '../utils/browserDetection';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const { brandName } = useResponsiveBrandName();
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [displayName, setDisplayName] = useState('')
  // Add state for dropdown

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      loadDisplayName();
      // Refresh unread count every 30 seconds
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    const { success, count } = await getUnreadNotificationCount();
    if (success && count !== undefined) {
      setUnreadCount(count);
    }
  };

  const loadDisplayName = async () => {
    if (!user) return;
    
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading username:', error);
        setDisplayName(`User_${user.id.slice(0, 6)}`);
        return;
      }
      
      if (userData?.username) {
        setDisplayName(userData.username);
      } else {
        // Fallback to truncated ID
        setDisplayName(`User_${user.id.slice(0, 6)}`);
      }
    } catch (error) {
      console.error('Error loading display name:', error);
      setDisplayName(`User_${user.id.slice(0, 6)}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-royalBlue">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="h-14 w-14 bg-white rounded-full p-0 shadow-md border border-royalBlue">
                <img src={logo} alt="Fantasy League Chess Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-2xl font-extrabold text-royalBlue tracking-wide font-serif drop-shadow">{brandName}</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/avatar-shop"
                  className="text-neutral-700 hover:text-royalBlue hover:underline hover:underline-offset-4 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Avatar Shop
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-neutral-700 hover:text-royalBlue hover:underline hover:underline-offset-4 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  to="/onboarding"
                  className="text-neutral-700 hover:text-royalBlue hover:underline hover:underline-offset-4 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Help
                </Link>

                {/* Discord Server Join - Only visible when signed in */}
                <div className="flex items-center">
                  <DiscordServerJoin className="!p-2 !text-sm !bg-gradient-to-r !from-indigo-500 !to-purple-600 !text-white !rounded-md !shadow-md hover:!shadow-lg transition-all duration-200" />
                </div>

                <button
                  onClick={() => setShowInbox(true)}
                  className="relative text-neutral-700 hover:text-royalBlue px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {user && (
                  <div className="relative ml-4">
                    <button
                      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-neutral-100 focus:outline-none"
                      onClick={() => setShowDropdown((prev) => !prev)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                    >
                      <span className="font-semibold text-neutral-900">{displayName}</span>
                      <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                        <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                        <a href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Dashboard</a>
                        <a href="/join-league" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Join League</a>
                        <a href="https://forms.gle/xDGEcbp5UPuVbJT16" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Feedback</a>
                        <a href="mailto:support@fantasyleaguechess.com" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Contact Support</a>
                        <button onClick={handleSignOut} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Sign Out</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsSignUp(false)
                    setShowAuthModal(true)
                  }}
                  className="flex items-center space-x-1 bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </button>
                <Link
                  to="/onboarding"
                  className="flex items-center space-x-1 bg-white border-2 border-royalBlue text-royalBlue hover:bg-royalBlue hover:text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAuthModal && typeof window !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <AuthModal
            isSignUp={isSignUp}
            onClose={() => setShowAuthModal(false)}
            onToggleMode={() => setIsSignUp(!isSignUp)}
          />
        </div>,
        document.body
      )}
      
      {showInbox && (
        <Inbox 
          isOpen={showInbox} 
          onClose={() => {
            setShowInbox(false);
            loadUnreadCount(); // Refresh count when closing
          }} 
        />
      )}
    </nav>
  )
}

type AuthModalProps = {
  isSignUp: boolean;
  onClose: () => void;
  onToggleMode: () => void;
};

const AuthModal: React.FC<AuthModalProps> = ({ isSignUp, onClose, onToggleMode }: AuthModalProps) => {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        const { error: signUpError } = await signUp(email, password, displayName)
        if (signUpError) {
          setError(signUpError.message)
        } else {
          setSuccess('Account created successfully! Please check your email to verify your account.')
          setTimeout(() => {
            onClose()
            setIsSignUp(false)
          }, 2000)
        }
      } else {
        const { error: signInError } = await signIn(email, password)
        if (signInError) {
          setError(signInError.message)
        } else {
          onClose()
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </h2>
        <p className="text-neutral-600">
          {isSignUp ? 'Join the fantasy chess community!' : 'Welcome back!'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue focus:border-transparent"
              placeholder="Enter your username"
              required
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue focus:border-transparent"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue focus:border-transparent"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-royalBlue text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-royalBlue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onToggleMode}
          className="text-royalBlue hover:text-blue-700 text-sm font-medium"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Navbar
