import * as React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Trophy, Users, Target, Coins, Store, ArrowLeft } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { useResponsiveBrandName } from '../utils/browserDetection';

const Onboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'help' | 'signup'>('help')
  const navigate = useNavigate()
  const { brandName, brandNameFull } = useResponsiveBrandName();

  const handleNext = () => {
    setCurrentStep('signup')
  }

  const handleSkipToSignup = () => {
    navigate('/signup')
  }

  if (currentStep === 'signup') {
    // Redirect to signup page
    navigate('/signup')
    return null
  }

  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-2 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
            <img src={logo} alt="FLC Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-4 font-serif drop-shadow">Welcome to {brandName}</h1>
          <p className="text-lg text-neutral-700">Your complete guide to mastering {brandName}</p>
          
          {/* Quick Action Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSkipToSignup}
              className="px-8 py-3 bg-royalBlue hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200 text-lg flex items-center justify-center"
            >
              🚀 Create Account & Start Playing
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/signin')}
              className="text-royalBlue hover:text-blue-700 font-semibold underline"
            >
              Sign In
            </button>
          </p>
        </div>

        {/* Quick Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-royalBlue" />
            What is {brandName}?
          </h2>
          <p className="text-neutral-700 mb-4">
            {brandNameFull} is a competitive game where you draft real chess players and earn points based on their performance 
            in actual chess tournaments. Build your dream team, set weekly lineups, trade players in the marketplace, and compete against other players for prizes!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <Users className="w-8 h-8 mx-auto mb-2 text-royalBlue" />
              <h3 className="font-semibold text-neutral-900">Draft Players</h3>
              <p className="text-sm text-neutral-700">Select from real chess players</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <Target className="w-8 h-8 mx-auto mb-2 text-purple" />
              <h3 className="font-semibold text-neutral-900">Set Lineups</h3>
              <p className="text-sm text-neutral-700">Choose your weekly team</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <Store className="w-8 h-8 mx-auto mb-2 text-gold" />
              <h3 className="font-semibold text-neutral-900">Trade Players</h3>
              <p className="text-sm text-neutral-700">Buy and sell in marketplace</p>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-royalBlue" />
              <h3 className="font-semibold text-neutral-900">Win Prizes</h3>
              <p className="text-sm text-neutral-700">Compete for coin rewards</p>
            </div>
          </div>
        </div>

        {/* Coin System Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold mb-4 flex items-center text-neutral-900">
            <Coins className="w-6 h-6 mr-2 text-royalBlue" />
            Coin System
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2 text-neutral-900">Weekly Rewards</h3>
              <p className="text-sm mb-2 text-neutral-700">Every week, all active players receive <strong>50 coins</strong> automatically.</p>
              <p className="text-sm text-neutral-700">Coins are used to:</p>
              <ul className="text-sm mt-2 space-y-1 text-neutral-700">
                <li>• Join leagues (buy-in costs)</li>
                <li>• Buy players in the marketplace</li>
                <li>• Purchase avatar customizations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-neutral-900">Standings Bonus</h3>
              <p className="text-sm mb-2 text-neutral-700">At the end of each league, players receive bonus coins based on their final rank:</p>
              <ul className="text-sm mt-2 space-y-1 text-neutral-700">
                <li>• <strong>1st Place:</strong> 50 bonus coins</li>
                <li>• <strong>2nd Place:</strong> 40 bonus coins</li>
                <li>• <strong>3rd Place:</strong> 30 bonus coins</li>
                <li>• <strong>4th Place:</strong> 20 bonus coins</li>
                <li>• <strong>5th+ Place:</strong> 10 bonus coins</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-8 mb-8">
          
          {/* Step 1: Joining a League */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">1</div>
              <h2 className="text-xl font-bold text-neutral-900">Join or Create a League</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Create a New League</h3>
                  <p className="text-neutral-700">Click "Create League" and set your league details:</p>
                  <ul className="list-disc list-inside text-neutral-700 mt-2 space-y-1">
                    <li>League name and description</li>
                    <li>Buy-in amount (in coins)</li>
                    <li>Start date (at least 7 days from today)</li>
                    <li>Maximum number of members</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Join an Existing League</h3>
                  <p className="text-neutral-700">Browse public leagues or use a join code to enter a private league.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Drafting Players */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
              <h2 className="text-xl font-bold text-neutral-900">Draft Your Team</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Snake Draft</h3>
                  <p className="text-neutral-700">Take turns picking players in a snake draft format. The order reverses each round.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Player Selection</h3>
                  <p className="text-neutral-700">Choose from real titled chess players. Consider their ratings, recent performance, and playing style.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Setting Lineups */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
              <h2 className="text-xl font-bold text-neutral-900">Set Weekly Lineups</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Choose 5 Players</h3>
                  <p className="text-neutral-700">Each week, select 5 players from your roster to compete.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Points System</h3>
                  <p className="text-neutral-700">Players earn points from Titled Tuesday games. Upsets vs Elo count the most; accuracy is a smaller bonus or penalty versus that player's own usual ACL. Each game is capped between −12 and +12.</p>
                  <ul className="list-disc list-inside text-neutral-700 mt-2 space-y-1">
                    <li>Small bonus for winning or drawing</li>
                    <li>Large bonus for beating a higher-rated opponent</li>
                    <li>Modest accuracy adjustment vs their own ACL average</li>
                    <li>+3 if the game is at least 5 ACL better than their usual play</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4: Trading */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">4</div>
              <h2 className="text-xl font-bold text-neutral-900">Trade in the Marketplace</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Buy Players</h3>
                  <p className="text-neutral-700">Use your coins to purchase players from other league members.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Sell Players</h3>
                  <p className="text-neutral-700">List your players for sale to earn coins for future trades.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-8 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center px-8 py-3 bg-royalBlue hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
          >
            Create Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>

    </div>
  )
}

export default Onboarding 