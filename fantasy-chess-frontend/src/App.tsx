import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import JoinLeague from './pages/JoinLeague'
import LeaguePage from './pages/League'
import Profile from './pages/Profile'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col w-full">
          <Navbar />
          <main className="flex-1 w-full px-0 py-0">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/join-league" element={<JoinLeague />} />
              <Route path="/league/:leagueId" element={<LeaguePage />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </Router>
      <Analytics />
    </AuthProvider>
  )
}

export default App 