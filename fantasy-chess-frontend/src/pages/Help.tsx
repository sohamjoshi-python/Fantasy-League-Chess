import React from 'react'
import { ArrowRight, Trophy, Users, Target, BarChart3, HelpCircle, Play } from 'lucide-react'

const Help: React.FC = () => {
  return (
    <div className="min-h-screen bg-neutral-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">How to Play Fantasy Chess</h1>
          <p className="text-lg text-neutral-500">Your complete guide to mastering Fantasy Chess</p>
        </div>

        {/* Quick Overview */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-accent" />
            What is Fantasy Chess?
          </h2>
          <p className="text-gray-700 mb-4">
            Fantasy Chess is a competitive game where you draft real chess players and earn points based on their performance 
            in actual chess tournaments. Build your dream team, set weekly lineups, and compete against other players for prizes!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-neutral-100 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <h3 className="font-semibold text-neutral-900">Draft Players</h3>
              <p className="text-sm text-neutral-500">Select from real chess players</p>
            </div>
            <div className="text-center p-4 bg-neutral-100 rounded-lg">
              <Target className="w-8 h-8 mx-auto mb-2 text-accent" />
              <h3 className="font-semibold text-neutral-900">Set Lineups</h3>
              <p className="text-sm text-neutral-500">Choose your weekly team</p>
            </div>
            <div className="text-center p-4 bg-neutral-100 rounded-lg">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
              <h3 className="font-semibold text-purple-900">Win Prizes</h3>
              <p className="text-sm text-purple-700">Compete for coin rewards</p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-8">
          {/* Step 1: Joining a League */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center font-bold mr-4">1</div>
              <h2 className="text-xl font-bold text-neutral-900">Join or Create a League</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Create a New League</h3>
                  <p className="text-neutral-900">Click "Create League" and set your league details:</p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                    <li>League name and description</li>
                    <li>Buy-in amount (in coins)</li>
                    <li>Start and end dates</li>
                    <li>Maximum number of players (up to 20)</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Join an Existing League</h3>
                  <p className="text-neutral-900">Use the join code provided by the league creator or browse public leagues.</p>
                </div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-neutral-900">
                  <strong>Tip:</strong> You can join multiple leagues, but they cannot overlap in time. Each league costs coins to join!
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: The Draft */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
              <h2 className="text-xl font-bold text-neutral-900">Participate in the Draft</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Wait for All Members</h3>
                  <p className="text-gray-700">
                    <strong>Important:</strong> Only start the draft once ALL intended members have joined your league. 
                    Once the draft begins, no new players can join, and the draft order is locked in place.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Snake Draft Format</h3>
                  <p className="text-gray-700">Draft players in a snake format - the order reverses each round:</p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                    <li>Round 1: Player 1, Player 2, Player 3, Player 4</li>
                    <li>Round 2: Player 4, Player 3, Player 2, Player 1</li>
                    <li>And so on for 10 rounds total</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Choose Your Players</h3>
                  <p className="text-gray-700">Select from real chess players with different ELO ratings. Higher ELO generally means better performance potential.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Build Your Team</h3>
                  <p className="text-gray-700">You'll draft 10 players total. These form your roster for the entire league season.</p>
                </div>
              </div>
              <div className="bg-neutral-100 p-4 rounded-lg text-red-700 border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Critical:</strong> Make sure all your intended league members have joined before starting the draft. 
                  Once started, the draft cannot be paused and no new members can join!
                </p>
              </div>
              <div className="bg-neutral-100 p-4 rounded-lg text-neutral-900">
                <p className="text-sm text-green-800">
                  <strong>Strategy:</strong> Consider player consistency, recent form, and upcoming tournaments when drafting!
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Setting Lineups */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
              <h2 className="text-xl font-bold text-neutral-900">Set Your Weekly Lineup</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Choose 5 Players</h3>
                  <p className="text-neutral-900">Each week, select 5 players from your 10-player roster to start in your lineup.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Weekly Deadlines</h3>
                  <p className="text-neutral-900">Lineups lock at the start of each week (Monday). Make sure to set your lineup before the deadline!</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Strategic Decisions</h3>
                  <p className="text-gray-700">Consider which players are competing in tournaments that week and their recent performance.</p>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Important:</strong> You can change your lineup anytime before the weekly deadline. After that, it's locked for the week!
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Scoring System */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold mr-4">4</div>
              <h2 className="text-xl font-bold text-neutral-900">Understanding Scoring</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Player Performance Points</h3>
                  <p className="text-neutral-900">Players earn points based on their actual chess game results:</p>
                  <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
                    <li><strong>Win:</strong> 3 points</li>
                    <li><strong>Draw:</strong> 1 point</li>
                    <li><strong>Loss:</strong> 0 points</li>
                    <li><strong>Bonus:</strong> Additional points for performance quality</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Weekly Totals</h3>
                  <p className="text-gray-700">Your lineup's total points are the sum of all 5 players' points for that week.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-orange-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-neutral-900">
                  <h3 className="font-semibold">Season Long Competition</h3>
                  <p className="text-neutral-900">Points accumulate throughout the league season. The player with the most total points at the end wins!</p>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-800">
                  <strong>Pro Tip:</strong> Check the "Point Breakdown" section to see exactly how each player earned their points!
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Winning and Prizes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold mr-4">5</div>
              <h2 className="text-xl font-bold text-neutral-900">Winning and Prizes</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">League Champion</h3>
                  <p className="text-neutral-900">The player with the highest total points at the end of the league season wins the championship!</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Prize Pool</h3>
                  <p className="text-neutral-900">The winner receives coins equal to the total buy-ins from all league members.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-accent mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">Automatic Payout</h3>
                  <p className="text-gray-700">Prizes are automatically processed when the league ends and distributed to the winner.</p>
                </div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Example:</strong> In a 10-player league with 100 coin buy-ins, the winner gets 1000 coins!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips and Strategies */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-accent" />
            Pro Tips & Strategies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">League Management</h3>
              <ul className="space-y-2 text-neutral-900">
                <li>• <strong>Wait for all intended members before starting draft</strong></li>
                <li>• Communicate with league members about draft timing</li>
                <li>• Set clear expectations for league participation</li>
                <li>• Consider league size when setting buy-in amounts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Draft Strategy</h3>
              <ul className="space-y-2 text-neutral-900">
                <li>• Balance high-ELO players with consistent performers</li>
                <li>• Consider players who compete frequently</li>
                <li>• Don't overlook lower-rated players with good form</li>
                <li>• Research upcoming tournaments before drafting</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Lineup Management</h3>
              <ul className="space-y-2 text-neutral-900">
                <li>• Check which players are competing each week</li>
                <li>• Monitor player form and recent results</li>
                <li>• Don't be afraid to bench high-ELO players</li>
                <li>• Set lineups early to avoid missing deadlines</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mt-8 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <Play className="w-6 h-6 mr-2" />
            Ready to Start?
          </h2>
          <p className="text-lg mb-4">
            Now that you understand how to play, it's time to join your first league!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="/join-league"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
            >Join a League
            </a>
            <a
              href="/dashboard"
              className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors text-center"
            >
              Go to Dashboard

            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-gray-500" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">How do I get coins?</h3>
              <p className="text-gray-700">New users start with 1000 coins. You can earn more by winning leagues!</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What happens if I don't set a lineup?</h3>
              <p className="text-gray-700">If you don't set a lineup by the weekly deadline, you'll score 0 points for that week.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Can I trade players?</h3>
              <p className="text-gray-700">Currently, player trading is not available. Your drafted team is your team for the season.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">How long do leagues last?</h3>
              <p className="text-gray-700">League duration varies by league. Check the start and end dates when joining.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">What if a player doesn't compete?</h3>
              <p className="text-gray-700">Players who don't compete in a given week score 0 points for that week.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">When should I start the draft?</h3>
              <p className="text-gray-700">
                <strong>Only start the draft after ALL intended members have joined.</strong> Once the draft begins, 
                no new players can join the league, and the draft order is permanently locked in place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Help 