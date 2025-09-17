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
import Leaderboard from './pages/Leaderboard';
import Tos from './pages/tos';
import Privacy from './pages/privacy';
import { useAuth } from './contexts/AuthContext'
import React from 'react';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

function AvatarShopPage() {
  const { user } = useAuth();
  const [showShop, setShowShop] = React.useState(true);
  if (!user) return <Profile />;
  return showShop ? (
    <Profile showOnlyShop={true} onCloseShop={() => setShowShop(false)} />
  ) : (
    <Profile />
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
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/avatar-shop" element={<ProtectedRoute><AvatarShopPage /></ProtectedRoute>} />
            <Route path="/tos" element={<Tos />} />
            <Route path="/privacy" element={<Privacy />} />
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
