import * as React from 'react'
import { Link } from 'react-router-dom'
import { Users, Trophy, Calendar, Star, Swords, Shield, HelpCircle } from 'lucide-react'
import logo from '../assets/pawn-royale-logo.png'

const Home: React.FC = () => {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center font-sans pt-20">
      {/* Hero Section */}
      <section className="w-full bg-white py-20 shadow-sm border-b border-gold">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center px-4">
          <div className="w-20 h-20 mb-4 bg-white rounded-full p-2 shadow-lg border-2 border-gold">
            <img src={logo} alt="Pawn Royale Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-5xl font-extrabold text-neutral-900 mb-4 tracking-tight font-serif drop-shadow">Pawn Royale</h1>
          <p className="text-lg text-neutral-700 mb-10 max-w-xl">
            The ultimate fantasy sports experience for chess fans. Draft titled players, set your lineup, and compete for glory every Titled Tuesday.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join-league" className="px-8 py-3 rounded-lg bg-[#1e293b] hover:bg-gold text-white font-semibold text-lg shadow-lg transition-all duration-200">Join a League</Link>
            <Link to="/help" className="px-8 py-3 rounded-lg bg-white border-2 border-gold text-gold font-semibold text-lg shadow-lg hover:bg-gold hover:text-white transition-all duration-200 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              How to Play
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full py-12 flex justify-center bg-white mt-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-gold">
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">About Pawn Royale</h2>
          <p className="text-neutral-700 text-base text-center">
            Pawn Royale brings the thrill of fantasy sports to the chess world. Join or create leagues, draft your favorite titled players, and compete with friends or the global community. Each week, set your lineup and earn points based on real Titled Tuesday tournament results. Climb the leaderboard, win coins, and prove your chess manager skills!
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-12 bg-white flex justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-gold hover:shadow-xl transition-shadow">
            <Users className="w-10 h-10 mb-3 text-gold" />
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Join a League</h3>
            <p className="text-neutral-700 text-center text-sm">Create or join a league. Each league is a month-long competition with a buy-in and prizes.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-gold hover:shadow-xl transition-shadow">
            <div className="w-10 h-10 mb-3 bg-white rounded-full p-1 border border-gold">
              <img src={logo} alt="Pawn Royale Logo" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Draft Your Team</h3>
            <p className="text-neutral-700 text-center text-sm">Take turns picking titled chess players in a fair snake draft. Build your dream team!</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-gold hover:shadow-xl transition-shadow">
            <Trophy className="w-10 h-10 mb-3 text-gold" />
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Set Weekly Lineups</h3>
            <p className="text-neutral-700 text-center text-sm">Choose 5 players each week. Earn points based on their real Titled Tuesday performance.</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-gold hover:shadow-xl transition-shadow">
            <Star className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Real-Time Scoring</h4>
              <p className="text-neutral-700 text-sm">Points update automatically after each Titled Tuesday.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-gold hover:shadow-xl transition-shadow">
            <Swords className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Snake Draft</h4>
              <p className="text-neutral-700 text-sm">Fair, competitive drafting for balanced teams.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-gold hover:shadow-xl transition-shadow">
            <Shield className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Secure & Transparent</h4>
              <p className="text-neutral-700 text-sm">All results and transactions are visible and verifiable.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-gold hover:shadow-xl transition-shadow">
            <Calendar className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Monthly Leagues</h4>
              <p className="text-neutral-700 text-sm">New leagues start every month. Join anytime!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring System Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-gold">
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Scoring System</h2>
          <ul className="text-neutral-700 text-base mb-4">
            <li><span className="font-semibold">Win:</span> 2.0 points</li>
            <li><span className="font-semibold">Draw:</span> 1.0 point</li>
            <li><span className="font-semibold">Loss:</span> 0.0 points</li>
            <li><span className="font-semibold">Upset Bonus:</span> Up to 5.0 points</li>
            <li><span className="font-semibold">Accuracy Bonus:</span> Up to 0.3 points</li>
            <li><span className="font-semibold">Total Range:</span> -6.0 to 12.0 points</li>
          </ul>
          <p className="text-neutral-700 text-center text-sm">Points are calculated using ELO, game results, and move accuracy (ACL). See the rules for full details.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 bg-white text-gold text-center font-medium tracking-wide mt-auto border-t-2 border-gold">
        &copy; {new Date().getFullYear()} Pawn Royale. All rights reserved.
      </footer>
    </div>
  )
}

export default Home 
