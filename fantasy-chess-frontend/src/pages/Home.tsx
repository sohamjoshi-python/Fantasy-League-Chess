import React from 'react'
import { Link } from 'react-router-dom'
import { Crown, Users, Trophy, Calendar, Star, Swords, Shield, HelpCircle } from 'lucide-react'

const accentBlue = 'text-[#4F6DF5]'
const accentGold = 'text-[#FFD600]'

const Home: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center font-sans pt-20">
      {/* Hero Section */}
      <section className="w-full bg-white py-16 shadow-sm border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center px-4">
          <Crown className={`w-16 h-16 mb-4 ${accentBlue}`} />
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">Fantasy Chess</h1>
          <p className="text-lg text-gray-600 mb-8 max-w-xl">
            The ultimate fantasy sports experience for chess fans. Draft titled players, set your lineup, and compete for glory every Titled Tuesday.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join-league" className="px-8 py-3 rounded-lg bg-[#4F6DF5] text-white font-semibold text-lg shadow hover:bg-blue-700 transition">Join a League</Link>
            <Link to="/help" className="px-8 py-3 rounded-lg bg-[#FFD600] text-gray-900 font-semibold text-lg shadow hover:bg-yellow-400 transition flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              How to Play
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full py-12 flex justify-center bg-gray-50 mt-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">About Fantasy Chess</h2>
          <p className="text-gray-700 text-base text-center">
            Fantasy Chess brings the thrill of fantasy sports to the chess world. Join or create leagues, draft your favorite titled players, and compete with friends or the global community. Each week, set your lineup and earn points based on real Titled Tuesday tournament results. Climb the leaderboard, win coins, and prove your chess manager skills!
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-12 bg-white flex justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-50 rounded-xl shadow p-6 flex flex-col items-center">
            <Users className={`w-10 h-10 mb-3 ${accentBlue}`} />
            <h3 className="font-semibold text-lg mb-2">Join a League</h3>
            <p className="text-gray-600 text-center text-sm">Create or join a league. Each league is a month-long competition with a buy-in and prizes.</p>
          </div>
          <div className="bg-gray-50 rounded-xl shadow p-6 flex flex-col items-center">
            <Crown className={`w-10 h-10 mb-3 ${accentGold}`} />
            <h3 className="font-semibold text-lg mb-2">Draft Your Team</h3>
            <p className="text-gray-600 text-center text-sm">Take turns picking titled chess players in a fair snake draft. Build your dream team!</p>
          </div>
          <div className="bg-gray-50 rounded-xl shadow p-6 flex flex-col items-center">
            <Trophy className="w-10 h-10 mb-3 text-purple-500" />
            <h3 className="font-semibold text-lg mb-2">Set Weekly Lineups</h3>
            <p className="text-gray-600 text-center text-sm">Choose 5 players each week. Earn points based on their real Titled Tuesday performance.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 flex justify-center bg-gray-50">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <Star className={`w-8 h-8 ${accentGold}`} />
            <div>
              <h4 className="font-semibold text-base mb-1">Real-Time Scoring</h4>
              <p className="text-gray-600 text-sm">Points update automatically after each Titled Tuesday.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <Swords className={`w-8 h-8 ${accentBlue}`} />
            <div>
              <h4 className="font-semibold text-base mb-1">Snake Draft</h4>
              <p className="text-gray-600 text-sm">Fair, competitive drafting for balanced teams.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <Shield className="w-8 h-8 text-green-500" />
            <div>
              <h4 className="font-semibold text-base mb-1">Secure & Transparent</h4>
              <p className="text-gray-600 text-sm">All results and transactions are visible and verifiable.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <Calendar className="w-8 h-8 text-indigo-500" />
            <div>
              <h4 className="font-semibold text-base mb-1">Monthly Leagues</h4>
              <p className="text-gray-600 text-sm">New leagues start every month. Join anytime!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring System Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-2xl w-full bg-gray-50 rounded-2xl shadow p-8 flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Scoring System</h2>
          <ul className="text-gray-700 text-base mb-4">
            <li><span className="font-semibold">Win:</span> 2.0 points</li>
            <li><span className="font-semibold">Draw:</span> 1.0 point</li>
            <li><span className="font-semibold">Loss:</span> 0.0 points</li>
            <li><span className="font-semibold">Upset Bonus:</span> Up to 5.0 points</li>
            <li><span className="font-semibold">Accuracy Bonus:</span> Up to 0.3 points</li>
            <li><span className="font-semibold">Total Range:</span> -6.0 to 12.0 points</li>
          </ul>
          <p className="text-gray-600 text-center text-sm">Points are calculated using ELO, game results, and move accuracy (ACL). See the rules for full details.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 bg-[#4F6DF5] text-white text-center font-medium tracking-wide mt-auto">
        &copy; {new Date().getFullYear()} Fantasy Chess. All rights reserved.
      </footer>
    </div>
  )
}

export default Home 
