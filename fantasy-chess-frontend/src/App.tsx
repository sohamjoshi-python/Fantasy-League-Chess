import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { trackPageView } from './lib/googleAnalytics'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import NewUserRedirect from './components/NewUserRedirect'
import Footer from './components/Footer';
import PwaSetup from './components/PwaSetup';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const JoinLeague = lazy(() => import('./pages/JoinLeague'))
const JoinInvite = lazy(() => import('./pages/JoinInvite'))
const LeaguePage = lazy(() => import('./pages/League'))
const Profile = lazy(() => import('./pages/Profile'))
const Help = lazy(() => import('./pages/Help'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const SignUp = lazy(() => import('./pages/SignUp'))
const SignIn = lazy(() => import('./pages/SignIn'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Tutorial = lazy(() => import('./pages/Tutorial'))
const EmailConfirmationSuccess = lazy(() => import('./pages/EmailConfirmationSuccess'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const PlayerHistory = lazy(() => import('./pages/PlayerHistory'))
const Tos = lazy(() => import('./pages/tos'))
const Privacy = lazy(() => import('./pages/privacy'))

function AvatarShopPage() {
  const navigate = useNavigate();
  return (
    <Profile
      showOnlyShop
      onCloseShop={() => navigate('/profile')}
    />
  );
}

function GoogleAnalyticsPageViews() {
  const location = useLocation()
  const skipFirstView = useRef(true)

  useEffect(() => {
    if (skipFirstView.current) {
      skipFirstView.current = false
      return
    }
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return null
}

function App() {
  return (
    <Router>
      <GoogleAnalyticsPageViews />
      <NewUserRedirect />
      <div className="min-h-screen flex flex-col w-full">
        <Navbar />
        <main className="flex-1 w-full px-0 py-0">
          <Suspense fallback={<div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/join-league" element={<ProtectedRoute><JoinLeague /></ProtectedRoute>} />
            <Route path="/join/:code" element={<JoinInvite />} />
            <Route path="/league/:leagueId" element={<ProtectedRoute><LeaguePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/rules" element={<Help />} />
            <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
            <Route path="/email-confirmed" element={<EmailConfirmationSuccess />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/avatar-shop" element={<ProtectedRoute><AvatarShopPage /></ProtectedRoute>} />
            <Route path="/tos" element={<Tos />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/player/:playerName" element={<ProtectedRoute><PlayerHistory /></ProtectedRoute>} />
          </Routes>
          </Suspense>
        </main>
        <Footer />
        <PwaSetup />
      </div>
      <Analytics />
      <SpeedInsights />
    </Router>
  )
}

export default App 
