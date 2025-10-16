import * as React from 'react'
import { ArrowRight, Trophy, Users, Target, BarChart3, HelpCircle, Play, Coins, Store, MessageCircle } from 'lucide-react'
import logo from '../assets/fantasy-league-chess-logo-updated.png'
import { getBrandName, getBrandNameFull } from '../utils/browserDetection';
import { useAuth } from '../contexts/AuthContext';

const Help: React.FC = () => {
  const { user, loading } = useAuth();
  
  // Debug logging
  console.log('Help page - user:', user, 'loading:', loading);
  
  return (
    <div className="min-h-screen bg-white py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-2 bg-white rounded-full p-0 shadow-lg border-2 border-royalBlue">
            <img src={logo} alt="Fantasy League Chess Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-neutral-900 mb-4 font-serif drop-shadow">How to Play {getBrandName()}</h1>
          <p className="text-lg text-neutral-700">Your complete guide to mastering {getBrandName()}</p>
        </div>

        {/* Quick Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-royalBlue" />
            What is {getBrandName()}?
          </h2>
          <p className="text-neutral-700 mb-4">
            {getBrandNameFull()} is a competitive game where you draft real chess players and earn points based on their performance 
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
        <div className="space-y-8">
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
                    <li>Start and end dates</li>
                    <li>Maximum number of players (up to 20)</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Join an Existing League</h3>
                  <p className="text-neutral-700">Use the join code provided by the league creator or browse public leagues.</p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Tip:</strong> You can join multiple leagues, but they cannot overlap in time. Each league costs coins to join!
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-4">
                <h4 className="font-semibold text-blue-900 mb-1">What is the Start Date?</h4>
                <p className="text-sm text-blue-900">
                  The <strong>start date</strong> is when your league officially begins and points start accumulating for all teams. <br/>
                  <strong>Important:</strong> The draft must be completed before the start date. No points are earned before this date, and no new members can join after the draft starts.
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 my-4">
                <h4 className="font-semibold text-blue-900 mb-1">League Wins Leaderboard Rules</h4>
                <p className="text-sm text-blue-900">
                  Only leagues with <strong>more than 5 players</strong> and <strong>no bots</strong> count toward the "Most League Wins" leaderboard. This ensures fair competition and prevents abuse.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: The Draft */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple text-white rounded-full flex items-center justify-center font-bold mr-4">2</div>
              <h2 className="text-xl font-bold text-neutral-900">Participate in the Draft</h2>
            </div>
            <div className="ml-12 space-y-4">
              {/* Bot info section */}
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Play Solo or Fill Leagues with Bots</h3>
                  <p className="text-neutral-700">
                    <strong>New:</strong> You can add a bot to your league! Bots will automatically draft and set lineups, letting you play by yourself or fill out leagues with fewer people. Just click <span className="font-semibold">Add Bot</span> on your league page before starting the draft.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Wait for All Members</h3>
                  <p className="text-neutral-700">
                    <strong>Important:</strong> Only start the draft once ALL intended members have joined your league. 
                    Once the draft begins, no new players can join, and the draft order is locked in place.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Snake Draft Format</h3>
                  <p className="text-neutral-700 mb-2">The snake draft ensures fair player selection by reversing the order each round. This gives everyone equal opportunity to get top players:</p>
                  <div className="bg-neutral-50 p-3 rounded border text-sm text-neutral-700 mb-2">
                    <div className="font-semibold mb-1">Example with 4 players:</div>
                    <div>Round 1: Player 1 → Player 2 → Player 3 → Player 4</div>
                    <div>Round 2: Player 4 → Player 3 → Player 2 → Player 1</div>
                    <div>Round 3: Player 1 → Player 2 → Player 3 → Player 4</div>
                    <div>Round 4: Player 4 → Player 3 → Player 2 → Player 1</div>
                    <div className="mt-1 text-xs text-neutral-600">...continues for 10 rounds total</div>
                  </div>
                  <p className="text-neutral-700 text-sm">
                    <strong>Why Snake Draft?</strong> This format ensures fairness - Player 1 gets first pick in odd rounds, but Player 4 gets first pick in even rounds. Everyone gets equal access to top talent!
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Choose Your Players</h3>
                  <p className="text-neutral-700">Select from real chess players with different ELO ratings. Higher ELO generally means better performance potential.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Build Your Team</h3>
                  <p className="text-neutral-700">You'll draft 10 players total. These form your roster for the entire league season.</p>
                </div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Critical:</strong> Make sure all your intended league members have joined before starting the draft. 
                  Once started, the draft cannot be paused and no new members can join!
                </p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Strategy:</strong> Consider player consistency, recent form, and upcoming tournaments when drafting!
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Setting Lineups */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">3</div>
              <h2 className="text-xl font-bold text-neutral-900">Set Your Weekly Lineup</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Choose 5 Players</h3>
                  <p className="text-neutral-700">Each week, select 5 players from your 10-player roster to start in your lineup.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Weekly Deadlines</h3>
                  <p className="text-neutral-700">Lineups lock at the start of each week (Monday). Make sure to set your lineup before the deadline!</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Strategic Decisions</h3>
                  <p className="text-neutral-700">Consider which players are competing in tournaments that week and their recent performance.</p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Important:</strong> You can change your lineup anytime before the weekly deadline. After that, it's locked for the week!
                </p>
              </div>
            </div>
          </div>

          {/* Step 4: Marketplace Trading */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-gold text-white rounded-full flex items-center justify-center font-bold mr-4">4</div>
              <h2 className="text-xl font-bold text-neutral-900">Trade Players in the Marketplace</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Two Marketplace Types</h3>
                  <p className="text-neutral-700">There are two ways to trade players:</p>
                  <ul className="list-disc list-inside text-neutral-700 mt-2 space-y-1">
                    <li><strong>Turn-Based Marketplace:</strong> Take turns buying players after the draft</li>
                    <li><strong>Regular Marketplace:</strong> Buy and sell players freely throughout the season</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Buying Players</h3>
                  <p className="text-neutral-700">Use your coins to purchase players from other league members or the system. Player prices are based on their ELO rating.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-gold mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Selling Players</h3>
                  <p className="text-neutral-700">Sell players you no longer want for coins. You can sell to other players or back to the system for 80% of their original value.</p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Strategy:</strong> Use the marketplace to improve your team throughout the season! Monitor player performance and trade accordingly.
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Scoring System */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple text-white rounded-full flex items-center justify-center font-bold mr-4">5</div>
              <h2 className="text-xl font-bold text-neutral-900">Understanding Scoring</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Player Performance Points</h3>
                  <p className="text-neutral-700">Players earn points based on their actual chess game results:</p>
                  <ul className="list-disc list-inside text-neutral-700 mt-2 space-y-1">
                    <li><strong>Win:</strong> 3 points</li>
                    <li><strong>Draw:</strong> 1 point</li>
                    <li><strong>Loss:</strong> 0 points</li>
                    <li><strong>Bonus:</strong> Additional points for performance quality</li>
                  </ul>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Weekly Totals</h3>
                  <p className="text-neutral-700">Your lineup's total points are the sum of all 5 players' points for that week.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-purple mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Season Long Competition</h3>
                  <p className="text-neutral-700">Points accumulate throughout the league season. The player with the most total points at the end wins!</p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue mb-4">
                <h4 className="font-semibold text-neutral-900 mb-2">What is Average Centipawn Loss (ACL)?</h4>
                <p className="text-sm text-neutral-700 mb-3">
                  <strong>Average Centipawn Loss (ACL)</strong> is a chess accuracy metric that measures how precisely a player moves compared to the best possible moves (as determined by chess engines). Think of it as a "chess accuracy score" where:
                </p>
                <ul className="text-sm text-neutral-700 mb-3 space-y-1">
                  <li>• <strong>Lower ACL = Better Play</strong> (more accurate moves)</li>
                  <li>• <strong>Higher ACL = Worse Play</strong> (more mistakes)</li>
                  <li>• <strong>0 ACL = Perfect Play</strong> (played the best move every time)</li>
                  <li>• <strong>100 ACL = Poor Play</strong> (made significant mistakes)</li>
                </ul>
                <p className="text-sm text-neutral-700">
                  In {getBrandName()}, ACL is the primary factor in scoring because it rewards consistent, high-quality play rather than just winning games. A player who loses but plays accurately will score better than a player who wins but makes many mistakes.
                </p>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue mb-4">
                <h4 className="font-semibold text-neutral-900 mb-2">Complete Scoring Formula</h4>
                <p className="text-sm text-neutral-700 mb-3">
                  Fantasy points are calculated using this sophisticated formula that rewards both winning and playing quality:
                </p>
                <div className="bg-white p-3 rounded border text-sm font-mono text-neutral-800 mb-3">
                  <div className="mb-2"><strong>Raw Points =</strong></div>
                  <div className="ml-4 mb-1">0.5 × Game Result</div>
                  <div className="ml-4 mb-1">+ 2.0 × (Result - Expected Score)</div>
                  <div className="ml-4 mb-1">+ 8.0 × (Average ACL - Player ACL)</div>
                  <div className="ml-4 mb-1">+ 3.0 × Consistency Bonus</div>
                  <div className="mt-2"><strong>Final Points =</strong> Raw Points (capped between -8 and +15)</div>
                </div>
                <div className="text-sm text-neutral-700 space-y-2">
                  <div><strong>• Game Result:</strong> 1.0 for win, 0.5 for draw, 0.0 for loss</div>
                  <div><strong>• Expected Score:</strong> Calculated based on ELO ratings (1/(1+10^((opponent_elo-player_elo)/400)))</div>
                  <div><strong>• ACL Delta:</strong> How much better/worse the player performed vs average</div>
                  <div><strong>• Consistency Bonus:</strong> Extra points for playing better than expected for their rating</div>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue mb-4">
                <h4 className="font-semibold text-neutral-900 mb-2">Two Completely Different Currencies</h4>
                <p className="text-sm text-neutral-700 mb-3">
                  Fantasy Chess uses TWO separate currencies to avoid confusion between the draft phase and trading phase:
                </p>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded border">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">💎</span>
                      <h5 className="font-semibold text-blue-900">GEMS - Draft-Only Currency</h5>
                    </div>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>ONLY used during turn-based marketplace (draft phase)</strong></li>
                      <li>• <strong>Everyone gets exactly 50 GEMS when draft starts</strong></li>
                      <li>• <strong>High-rated players cost more GEMS (Magnus Carlsen = 50 GEMS)</strong></li>
                      <li>• <strong>Once spent, GEMS are gone forever - they don't regenerate</strong></li>
                      <li>• <strong>When draft ends, all remaining GEMS disappear</strong></li>
                      <li>• Purpose: Fair team building during initial draft only</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-3 rounded border">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-2">🪙</span>
                      <h5 className="font-semibold text-green-900">COINS - Season Trading Currency</h5>
                    </div>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• <strong>Used for ALL trading after the draft ends</strong></li>
                      <li>• <strong>You earn 50 COINS every week throughout the season</strong></li>
                      <li>• <strong>Buy/sell/trade players with other league members</strong></li>
                      <li>• <strong>Prices fluctuate based on player performance and demand</strong></li>
                      <li>• <strong>COINS accumulate - you keep them week to week</strong></li>
                      <li>• Purpose: Ongoing team management and strategy throughout the season</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Key Difference:</strong> GEMS are a one-time draft currency that disappears forever. COINS are your permanent trading currency that you earn weekly and use throughout the entire season.
                  </p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Pro Tip:</strong> Check the "Point Breakdown" section to see exactly how each player earned their points!
                </p>
              </div>
            </div>
          </div>

          {/* Step 6: Winning and Prizes */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-royalBlue">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-royalBlue text-white rounded-full flex items-center justify-center font-bold mr-4">6</div>
              <h2 className="text-xl font-bold text-neutral-900">Winning and Prizes</h2>
            </div>
            <div className="ml-12 space-y-4">
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">League Champion</h3>
                  <p className="text-neutral-700">The player with the highest total points at the end of the league season wins the championship!</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Prize Pool</h3>
                  <p className="text-neutral-700">The winner receives coins equal to the total buy-ins from all league members.</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Standings Bonus</h3>
                  <p className="text-neutral-700">All players receive bonus coins based on their final rank (1st: 50 coins, 2nd: 40 coins, etc.).</p>
                </div>
              </div>
              <div className="flex items-start">
                <ArrowRight className="w-5 h-5 text-royalBlue mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-neutral-900">Automatic Payout</h3>
                  <p className="text-neutral-700">Prizes are automatically processed when the league ends and distributed to all participants.</p>
                </div>
              </div>
              <div className="bg-neutral-50 p-4 rounded-lg border border-royalBlue">
                <p className="text-sm text-neutral-700">
                  <strong>Example:</strong> In a 10-player league with 100 coin buy-ins, the winner gets 1000 coins plus 50 bonus coins for 1st place!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips and Strategies */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-purple" />
            Pro Tips & Strategies
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">League Management</h3>
              <ul className="space-y-2 text-neutral-700">
                <li>• <strong>Wait for all intended members before starting draft</strong></li>
                <li>• Communicate with league members about draft timing</li>
                <li>• Set clear expectations for league participation</li>
                <li>• Consider league size when setting buy-in amounts</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Draft Strategy</h3>
              <ul className="space-y-2 text-neutral-700">
                <li>• Balance high-ELO players with consistent performers</li>
                <li>• Consider players who compete frequently</li>
                <li>• Don't overlook lower-rated players with good form</li>
                <li>• Research upcoming tournaments before drafting</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Marketplace Strategy</h3>
              <ul className="space-y-2 text-neutral-700">
                <li>• Monitor player performance weekly</li>
                <li>• Buy low on underperforming stars</li>
                <li>• Sell high on overperforming players</li>
                <li>• Use the marketplace to improve your team</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 mb-2">Lineup Management</h3>
              <ul className="space-y-2 text-neutral-700">
                <li>• Check which players are competing each week</li>
                <li>• Monitor player form and recent results</li>
                <li>• Don't be afraid to bench high-ELO players</li>
                <li>• Set lineups early to avoid missing deadlines</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gradient-to-r from-royalBlue to-purple rounded-xl shadow-lg p-6 mt-8 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Play className="w-6 h-6 mr-2" />
            Ready to Start?
          </h2>
          <p className="text-lg mb-4">
            Now that you understand how to play, it's time to join your first league!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {loading ? (
              // Show loading state
              <div className="flex items-center justify-center py-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                <span>Loading...</span>
              </div>
            ) : user ? (
              // Show authenticated user options
              <>
                <a
                  href="/join-league"
                  className="bg-white text-neutral-900 px-6 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors text-center border border-white shadow-lg"
                >
                  Join a League
                </a>
                <a
                  href="/dashboard"
                  className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-neutral-900 transition-colors text-center"
                >
                  Go to Dashboard
                </a>
              </>
            ) : (
              // Show unauthenticated user options
              <>
                <a
                  href="/signup"
                  className="bg-white text-neutral-900 px-6 py-3 rounded-lg font-semibold hover:bg-neutral-100 transition-colors text-center border border-white shadow-lg"
                >
                  Create Account & Start Playing
                </a>
                <a
                  href="/signin"
                  className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-neutral-900 transition-colors text-center"
                >
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-royalBlue" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-neutral-900">How do I get coins?</h3>
              <p className="text-neutral-700">New users start with 1000 coins. You earn 50 coins every week automatically, plus bonus coins based on league standings!</p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">What happens if I don't set a lineup?</h3>
              <p className="text-neutral-700">If you don't set a lineup by the weekly deadline, you'll score 0 points for that week.</p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Can I trade players?</h3>
              <p className="text-neutral-700">Yes! Use the marketplace to buy and sell players throughout the season. You can trade with other players or sell back to the system.</p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">How long do leagues last?</h3>
              <p className="text-neutral-700">League duration varies by league. Check the start and end dates when joining.</p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">What if a player doesn't compete?</h3>
              <p className="text-neutral-700">Players who don't compete in a given week score 0 points for that week.</p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">When should I start the draft?</h3>
              <p className="text-neutral-700">
                <strong>Only start the draft after ALL intended members have joined.</strong> Once the draft begins, 
                no new players can join the league, and the draft order is permanently locked in place.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">How does the marketplace work?</h3>
              <p className="text-neutral-700">There are two marketplace types: turn-based (after draft) and regular (throughout season). Use coins to buy players from other members or sell players you no longer want.</p>
            </div>
            <div className="bg-gold-50 p-4 rounded-lg border border-gold-200 my-4">
              <h4 className="font-semibold text-gold-900 mb-1">Profile & Avatar Customizations</h4>
              <p className="text-sm text-gold-900">
                You can spend your coins to unlock and equip unique avatars for your profile! Visit your profile page and open the Avatar Shop to browse, purchase, and equip new looks. Show off your style in the standings and on the leaderboard!
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Feedback Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-2 border-royalBlue">
          <h2 className="text-2xl font-bold text-neutral-900 mb-4 flex items-center">
            <HelpCircle className="w-6 h-6 mr-2 text-royalBlue" />
            Need Help or Have Feedback?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-royalBlue" />
              <h3 className="font-semibold text-neutral-900 mb-2">Share Your Feedback</h3>
              <p className="text-sm text-neutral-700 mb-3">Help us improve by sharing your thoughts and suggestions</p>
              <a 
                href="https://forms.gle/xDGEcbp5UPuVbJT16" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-royalBlue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Give Feedback
              </a>
            </div>
            <div className="text-center p-4 bg-neutral-50 rounded-lg border border-royalBlue">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-royalBlue" />
              <h3 className="font-semibold text-neutral-900 mb-2">Contact Support</h3>
              <p className="text-sm text-neutral-700 mb-3">Get help with technical issues or account problems</p>
              <a 
                href="mailto:support@fantasyleaguechess.com"
                className="inline-block bg-royalBlue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Email Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Help 