import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, UserPlus, HelpCircle, Bell } from 'lucide-react'
import { getUnreadNotificationCount, supabase } from '../lib/supabase'
import Inbox from './Inbox'
import logo from '../assets/pawn-royale-logo.png'

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [showInbox, setShowInbox] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [displayName, setDisplayName] = useState('')
  // Add state for dropdown
  const [showDropdown, setShowDropdown] = useState(false);

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
      // Get username from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('username')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error loading username:', error);
        setDisplayName(user.email || user.id.slice(0, 6));
        return;
      }
      
      if (userData?.username) {
        setDisplayName(userData.username);
      } else {
        // Fallback to email or truncated ID
        setDisplayName(user.email || user.id.slice(0, 6));
      }
    } catch (error) {
      console.error('Error loading display name:', error);
      setDisplayName(user.email || user.id.slice(0, 6));
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
                <img src={logo} alt="Pawn Royale Logo" className="h-full w-full object-contain" />
              </div>
              <span className="text-2xl font-extrabold text-royalBlue tracking-wide font-serif drop-shadow">PAWN ROYALE</span>
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
                  to="/help"
                  className="text-neutral-700 hover:text-royalBlue hover:underline hover:underline-offset-4 px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <HelpCircle className="h-4 w-4 mr-1" />
                  Help
                </Link>
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
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                        <a href="/profile" className="block px-4 py-2 hover:bg-neutral-100">Profile</a>
                        <a href="/join-league" className="block px-4 py-2 hover:bg-neutral-100">Join League</a>
                        <a href="/dashboard" className="block px-4 py-2 hover:bg-neutral-100">Dashboard</a>
                        <button onClick={handleSignOut} className="w-full text-left px-4 py-2 hover:bg-neutral-100 text-red-600">Sign Out</button>
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
                <button
                  onClick={() => {
                    setIsSignUp(true)
                    setShowAuthModal(true)
                  }}
                  className="flex items-center space-x-1 bg-white border-2 border-royalBlue text-royalBlue hover:bg-royalBlue hover:text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </button>
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
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        await signUp(email, password, displayName)
        setTimeout(async () => {
          const { supabase } = await import('../lib/supabase')
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setSuccess('Check your inbox to confirm your email before logging in.')
          } else {
            setSuccess('Account created! Logging you in...')
            setTimeout(() => {
              setSuccess('')
              onClose()
            }, 2000)
          }
        }, 500)
      } else {
        await signIn(email, password)
        setSuccess('Logged in!')
        navigate('/dashboard');
        setTimeout(() => {
          setSuccess('')
          onClose()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Signup/Login error:', error)
      setError(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative shadow-lg border-2 border-royalBlue">
      <h2 className="text-2xl font-bold mb-6 text-center text-neutral-900">
        {isSignUp ? 'Create Account' : 'Sign In'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
            placeholder="Enter your email"
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
            required
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
            placeholder="Enter your password"
          />
        </div>
        {isSignUp && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-neutral-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royalBlue text-neutral-900 placeholder-neutral-500"
              placeholder="Enter your display name"
            />
          </div>
        )}
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        {success && (
          <div className="text-green-600 text-sm animate-fade-in-out absolute top-2 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded shadow z-50 border border-green-200">
            {success}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1e293b] hover:bg-royalBlue disabled:bg-neutral-400 text-white py-2 px-4 rounded-md font-medium shadow-lg transition-colors"
        >
          {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>
      <div className="mt-4 text-center">
        <button
          onClick={onToggleMode}
          className="text-neutral-500 hover:text-royalBlue text-sm transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

export default Navbar 
