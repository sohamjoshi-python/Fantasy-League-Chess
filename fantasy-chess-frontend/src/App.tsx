import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import NewUserRedirect from './components/NewUserRedirect'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import JoinLeague from './pages/JoinLeague'
import LeaguePage from './pages/League'
import Profile from './pages/Profile'
import Help from './pages/Help'
import Leaderboard from './pages/Leaderboard';
import Tos from './pages/tos';
import Privacy from './pages/privacy';
import { AuthProvider, useAuth } from './contexts/AuthContext'
import React from 'react';

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
    <AuthProvider>
      <Router>
        <NewUserRedirect />
        <div className="min-h-screen flex flex-col w-full">
          <Navbar />
          <main className="flex-1 w-full px-0 py-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/join-league" element={<JoinLeague />} />
              <Route path="/league/:leagueId" element={<LeaguePage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/help" element={<Help />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/avatar-shop" element={<AvatarShopPage />} />
              <Route path="/tos" element={<Tos />} />
              <Route path="/privacy" element={<Privacy />} />
            </Routes>
          </main>
        </div>
        <Analytics />
      </Router>
    </AuthProvider>
  )
}

export default App 
