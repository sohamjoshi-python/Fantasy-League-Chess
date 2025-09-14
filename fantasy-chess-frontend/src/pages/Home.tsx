import * as React from 'react'
import { Link } from 'react-router-dom'
import { Trophy, Users, Coins, Store, HelpCircle, Star, Swords, Shield, Calendar } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { useResponsiveBrandName } from '../utils/browserDetection';

const Home: React.FC = () => {
  const { brandName, brandNameFull } = useResponsiveBrandName();
  
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center font-sans pt-20">
      {/* Hero Section */}
      <section className="w-full bg-white py-20 shadow-sm border-b border-royalBlue">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center px-4">
          <div className="w-28 h-28 mb-4 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
            <img src={logo} alt="Fantasy League Chess Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-5xl font-extrabold text-neutral-900 mb-4 tracking-tight font-serif drop-shadow">{brandName}</h1>
          <p className="text-lg text-neutral-700 mb-10 max-w-xl">
            The ultimate fantasy sports experience for chess fans. Draft titled players, set your lineup, trade in the marketplace, and compete for glory every Titled Tuesday.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join-league" className="px-8 py-3 rounded-lg bg-[#1e293b] hover:bg-royalBlue text-white font-semibold text-lg shadow-lg transition-all duration-200">Join a League</Link>
            <Link to="/onboarding" className="px-8 py-3 rounded-lg bg-white border-2 border-royalBlue text-royalBlue font-semibold text-lg shadow-lg hover:bg-royalBlue hover:text-white transition-all duration-200 flex items-center">
              <HelpCircle className="w-5 h-5 mr-2" />
              How to Play
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full py-12 flex justify-center bg-white mt-12">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-royalBlue">
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">About {brandName}</h2>
          <p className="text-neutral-700 mb-6">
            {brandNameFull} brings the thrill of fantasy sports to the chess world. Join or create leagues, draft your favorite titled players, trade in the marketplace, and compete with friends or the global community.
          </p>
        </div>
      </section>


      {/* How It Works Section */}
      <section className="w-full py-12 bg-white flex justify-center">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Users className="w-10 h-10 mb-3 text-royalBlue" />
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Join a League</h3>
            <p className="text-neutral-700 text-center text-sm">Create or join a league. Each league is a month-long competition with a buy-in and prizes.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 mb-3 bg-white rounded-full p-0 border border-royalBlue">
              <img src={logo} alt="Pawn Royale Logo" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Draft Your Team</h3>
            <p className="text-neutral-700 text-center text-sm">Take turns picking titled chess players in a fair snake draft. Build your dream team!</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Trophy className="w-10 h-10 mb-3 text-royalBlue" />
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Set Weekly Lineups</h3>
            <p className="text-neutral-700 text-center text-sm">Choose 5 players each week. Earn points based on their real Titled Tuesday performance.</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Store className="w-10 h-10 mb-3 text-gold" />
            <h3 className="font-semibold text-lg mb-2 text-neutral-900">Trade Players</h3>
            <p className="text-neutral-700 text-center text-sm">Buy and sell players in the marketplace throughout the season to improve your team.</p>
          </div>
        </div>
      </section>

      {/* Coin System Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <Coins className="w-16 h-16 mx-auto mb-4 text-royalBlue" />
            <h2 className="text-3xl font-bold mb-4 text-neutral-900">Coin System</h2>
            <p className="text-lg mb-6 text-neutral-700">Earn coins weekly and through league performance!</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-royalBlue">
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Weekly Rewards</h3>
              <p className="mb-4 text-neutral-700">Every week, all active players receive <strong>50 coins</strong> automatically.</p>
              <ul className="space-y-2 text-neutral-700">
                <li>• Join leagues with buy-ins</li>
                <li>• Buy players in marketplace</li>
                <li>• Purchase avatar customizations</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-royalBlue">
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Standings Bonus</h3>
              <p className="mb-4 text-neutral-700">End-of-league bonus coins based on final rank:</p>
              <ul className="space-y-1 text-neutral-700">
                <li>• <strong>1st Place:</strong> 50 bonus coins</li>
                <li>• <strong>2nd Place:</strong> 40 bonus coins</li>
                <li>• <strong>3rd Place:</strong> 30 bonus coins</li>
                <li>• <strong>4th Place:</strong> 20 bonus coins</li>
                <li>• <strong>5th+ Place:</strong> 10 bonus coins</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Star className="w-8 h-8 text-royalBlue" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Real-Time Scoring</h4>
              <p className="text-neutral-700 text-sm">Points update automatically after each Titled Tuesday.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Swords className="w-8 h-8 text-royalBlue" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Snake Draft</h4>
              <p className="text-neutral-700 text-sm">Fair, competitive drafting for balanced teams.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Store className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Player Marketplace</h4>
              <p className="text-neutral-700 text-sm">Trade players throughout the season to improve your team.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Shield className="w-8 h-8 text-royalBlue" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Secure & Transparent</h4>
              <p className="text-neutral-700 text-sm">All results and transactions are visible and verifiable.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Calendar className="w-8 h-8 text-royalBlue" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Monthly Leagues</h4>
              <p className="text-neutral-700 text-sm">New leagues start every month. Join anytime!</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex items-center gap-4 border-2 border-royalBlue hover:shadow-xl transition-shadow">
            <Coins className="w-8 h-8 text-gold" />
            <div>
              <h4 className="font-semibold text-base mb-1 text-neutral-900">Weekly Rewards</h4>
              <p className="text-neutral-700 text-sm">Earn 50 coins every week automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Scoring System Section */}
      <section className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center border-2 border-royalBlue">
          <h2 className="text-2xl font-bold mb-2 text-neutral-900">Scoring System</h2>
          <ul className="text-neutral-700 text-base mb-4">
            <li><span className="font-semibold">Win:</span> 3.0 points</li>
            <li><span className="font-semibold">Draw:</span> 1.0 point</li>
            <li><span className="font-semibold">Loss:</span> 0.0 points</li>
            <li><span className="font-semibold">Performance Bonus:</span> Based on average centipawn loss (ACL)</li>
          </ul>
          <p className="text-neutral-700 text-center text-sm">Points are calculated using game results and player average centipawn loss (ACL). See the rules for full details.</p>
        </div>
      </section>



      {/* Contact & Feedback Section */}
      <div className="w-full py-12 flex justify-center bg-white">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 text-royalBlue" />
            <h2 className="text-3xl font-bold mb-4 text-neutral-900">Get in Touch</h2>
            <p className="text-lg mb-6 text-neutral-700">Share your feedback or need assistance.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Share Your Feedback</h3>
              <p className="mb-4 text-neutral-700">Help us improve Fantasy League Chess</p>
              <a 
                href="https://forms.gle/xDGEcbp5UPuVbJT16" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-royalBlue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Give Feedback
              </a>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
              <h3 className="text-xl font-semibold mb-3 text-neutral-900">Need Help?</h3>
              <p className="mb-4 text-neutral-700">Contact our support team</p>
              <a 
                href="mailto:support@fantasyleaguechess.com"
                className="inline-block bg-royalBlue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ToS/Privacy links */}
      <div className="w-full py-4 bg-white text-center text-xs text-neutral-500 mt-8">
        <a href="/tos" className="underline hover:text-royalBlue mx-2">Terms of Service</a>
        |
        <a href="/privacy" className="underline hover:text-royalBlue mx-2">Privacy Policy</a>
      </div>
    </div>
  )
}

export default Home
