import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import Navbar from './components/Navbar'
import NewUserRedirect from './components/NewUserRedirect'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import JoinLeague from './pages/JoinLeague'
import LeaguePage from './pages/League'
import Profile from './pages/Profile'
import Help from './pages/Help'
import Onboarding from './pages/Onboarding'
import SignUp from './pages/SignUp'
import SignIn from './pages/SignIn'
import ResetPassword from './pages/ResetPassword'
import Tutorial from './pages/Tutorial'
import EmailConfirmationSuccess from './pages/EmailConfirmationSuccess'
import Leaderboard from './pages/Leaderboard';
import PlayerHistory from './pages/PlayerHistory';
import Tos from './pages/tos';
import Privacy from './pages/privacy';
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

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
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/avatar-shop" element={<ProtectedRoute><AvatarShopPage /></ProtectedRoute>} />
            <Route path="/tos" element={<Tos />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/player/:playerName" element={<ProtectedRoute><PlayerHistory /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
      <Analytics />
      <SpeedInsights />
    </Router>
  )
}

export default App 
