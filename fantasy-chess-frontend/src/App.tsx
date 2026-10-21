import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import NewUserRedirect from './components/NewUserRedirect'
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const JoinLeague = lazy(() => import('./pages/JoinLeague'))
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

function App() {
  return (
    <Router>
      <NewUserRedirect />
      <div className="min-h-screen flex flex-col w-full">
        <Navbar />
        <main className="flex-1 w-full px-0 py-0">
          <Suspense fallback={<div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/join-league" element={<ProtectedRoute><JoinLeague /></ProtectedRoute>} />
            <Route path="/league/:leagueId" element={<ProtectedRoute><LeaguePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/help" element={<Help />} />
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
      </div>
      <Analytics />
      <SpeedInsights />
    </Router>
  )
}

export default App 
