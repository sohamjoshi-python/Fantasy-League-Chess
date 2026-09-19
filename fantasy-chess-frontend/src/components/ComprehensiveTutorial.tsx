import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trophy, Users, Target, Coins, Store, CheckCircle, Crown, Calendar, Plus, Medal, User, ChevronDown, ChevronUp } from 'lucide-react';
import TutorialCallout from './TutorialCallout';
import TutorialMiniSite from './TutorialMiniSite';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  target: string;
  page: string;
}

const ComprehensiveTutorial: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showTutorial] = useState(true);
  const [sampleData, setSampleData] = useState<any>(null);
  const [showStepsDropdown, setShowStepsDropdown] = useState(false);
  const [miniLeaderboardOpen, setMiniLeaderboardOpen] = useState(false);
  
  // Sample data initialization
  const initializeSampleData = () => {
    const data = {
      leagues: [
        {
          id: 'tutorial-league',
          name: 'Tutorial Champions League',
          description: 'Perfect for beginners! Learn the ropes in this sample league.',
          members: 8,
          maxMembers: 12,
          entryFee: 0,
          prizePool: 0,
          difficulty: 'Beginner',
          duration: '5 minutes',
          start_date: 'Now'
        },
        {
          id: 'advanced-league',
          name: 'Advanced Strategy League',
          description: 'For experienced players seeking a challenge.',
          members: 10,
          maxMembers: 16,
          entryFee: 25,
          prizePool: 400,
          difficulty: 'Advanced',
          duration: '1 month',
          start_date: '2024-02-01'
        },
        {
          id: 'casual-league',
          name: 'Casual Weekend Warriors',
          description: 'Relaxed gameplay for casual chess fans.',
          members: 6,
          maxMembers: 10,
          entryFee: 10,
          prizePool: 100,
          difficulty: 'Casual',
          duration: '2 weeks',
          start_date: '2024-01-28'
        }
      ],
      marketplace: [
        { id: 'magnus', name: 'Magnus Carlsen', elo: 2850, country: 'Norway', tier: 'S+', price: 50 },
        { id: 'fabiano', name: 'Fabiano Caruana', elo: 2780, country: 'USA', tier: 'S', price: 45 },
        { id: 'ding', name: 'Ding Liren', elo: 2750, country: 'China', tier: 'S', price: 40 },
        { id: 'nepo', name: 'Ian Nepomniachtchi', elo: 2740, country: 'Russia', tier: 'A+', price: 38 },
        { id: 'levon', name: 'Levon Aronian', elo: 2730, country: 'Armenia', tier: 'A+', price: 36 },
        { id: 'wesley', name: 'Wesley So', elo: 2720, country: 'USA', tier: 'A', price: 34 }
      ],
      leaderboard: [
        { user_id: 'user', username: 'You', total_points: 1250, total_leagues: 3, wins: 2 },
        { user_id: '1', username: 'ChessWizard92', total_points: 1420, total_leagues: 5, wins: 3 },
        { user_id: '2', username: 'KnightRider', total_points: 1380, total_leagues: 4, wins: 2 },
        { user_id: '3', username: 'QueenSlayer', total_points: 1340, total_leagues: 6, wins: 4 },
        { user_id: '4', username: 'PawnStorm', total_points: 1290, total_leagues: 3, wins: 1 }
      ]
    };
    setSampleData(data);
  };

  useEffect(() => {
    initializeSampleData();
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Join a league',
      description: 'Leagues are where you draft a team and compete.',
      action: 'Click Join a League',
      target: 'join-league-button',
      page: 'dashboard'
    },
    {
      id: 'league-selection',
      title: 'Pick this one',
      description: 'The Tutorial Champions League is free.',
      action: 'Click Join',
      target: 'join-tutorial-league',
      page: 'join-league'
    },
    {
      id: 'league-overview',
      title: 'Your league',
      description: 'Standings, lineup, and the draft all live here.',
      action: 'Click Start Turn-Based Marketplace',
      target: 'start-marketplace-button',
      page: 'league'
    },
    {
      id: 'marketplace-start',
      title: 'Draft with coins',
      description: 'Everyone gets 50 coins. Magnus costs 50.',
      action: 'Click Buy Player on Magnus',
      target: 'buy-magnus',
      page: 'league'
    },
    {
      id: 'team-building',
      title: 'Keep drafting',
      description: 'That spent your 50 coins. Add one more player to finish this example.',
      action: 'Click Buy Player on Ding',
      target: 'buy-ding',
      page: 'league'
    },
    {
      id: 'marketplace-complete',
      title: 'Set a lineup',
      description: 'Pick who plays this week.',
      action: 'Click Edit',
      target: 'set-lineup-button',
      page: 'league'
    },
    {
      id: 'lineup-selection',
      title: 'Save it',
      description: 'You can change this before each round.',
      action: 'Click Save Lineup',
      target: 'save-lineup-button',
      page: 'league'
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'League standings are on the league page. Global rankings are under Leaderboard.',
      action: 'Click Leaderboard in the mini nav',
      target: 'mini-leaderboard-link',
      page: 'leaderboard'
    },
    {
      id: 'how-it-works',
      title: 'Scoring',
      description: 'Leagues last a month. Bots fill empty seats. Points come from real Tuesday games — upsets score big.',
      action: 'Click Next',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'currency-and-trading',
      title: 'Gems vs coins',
      description: 'Gems (💎) buy leagues, avatars, and prizes. Coins (🪙) stay in the league: 50 at draft, then 50 a week to trade.',
      action: 'Click Next',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'profile',
      title: "You're in",
      description: "That's the whole loop. Help has the rest of the rules.",
      action: 'Click Start Playing',
      target: 'start-playing-button',
      page: 'profile'
    }
  ];

  const currentStepData = tutorialSteps[currentStep];
  const activeTarget =
    currentStepData.id === 'leaderboard' && miniLeaderboardOpen
      ? 'next-step-button'
      : currentStepData.target;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStep + 1];
      setCurrentStep(currentStep + 1);
      setCurrentPage(nextStep.page);
    }
  };


  const handleTargetClick = (targetId: string) => {
    if (targetId === 'mini-leaderboard-link' && currentStepData.id === 'leaderboard' && !miniLeaderboardOpen) {
      setMiniLeaderboardOpen(true);
      return;
    }

    if (activeTarget === targetId) {
      if (targetId === 'start-playing-button' && currentStep === tutorialSteps.length - 1) {
        navigate('/dashboard');
        return;
      }

      handleNext();
    }
  };

  useEffect(() => {
    setMiniLeaderboardOpen(false);
  }, [currentStep]);

  const handleSkipTutorial = () => {
    navigate('/join-league');
  };


  const [leagueJoined] = useState(false);

  if (!showTutorial || !sampleData) {
    return null;
  }

  // Render different pages based on current step
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboard();
      case 'join-league':
        return renderJoinLeague();
      case 'league':
        return renderLeague();
      case 'leaderboard':
        return renderLeaderboardMiniSite();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen">
      <h1 className="text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-8 text-center tracking-tight font-serif drop-shadow relative">
        Dashboard
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-royalBlue to-gold rounded-full"></div>
      </h1>

      {!leagueJoined ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md mx-auto bg-white rounded-xl shadow-lg border-2 border-gray-100 p-8">
            <Crown className="h-12 w-12 lg:h-16 lg:w-16 text-royalBlue mx-auto mb-4" />
            <h2 className="text-xl lg:text-2xl font-bold mb-4 text-neutral-900">No Active League</h2>
            <p className="text-neutral-700 mb-6 text-sm lg:text-base">
              You're not currently in any active league. Join or create one to start playing!
            </p>
            <div className="relative">
              <button
                id="join-league-button"
                onClick={() => handleTargetClick('join-league-button')}
                className={`inline-flex items-center space-x-2 bg-[#1e293b] hover:bg-royalBlue text-white px-4 lg:px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                  currentStepData.target === 'join-league-button' ? 'ring-2 ring-blue-300 animate-pulse' : ''
                }`}
              >
                <Plus className="h-5 w-5" />
                <span>Join a League</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 lg:space-y-8">
          {/* Current League Info */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Tutorial Champions League</h3>
            <div className="flex items-center space-x-2 text-sm text-neutral-600">
              <Users className="h-4 w-4" />
              <span>8/12 members</span>
              <span>•</span>
              <span>Beginner difficulty</span>
            </div>
          </div>

          {/* View League Button */}
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Ready to manage your league?</h3>
            <div className="relative">
              <button
                id="view-league-button"
                onClick={() => handleTargetClick('view-league-button')}
                className={`inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                  currentStepData.target === 'view-league-button'
                    ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse'
                    : ''
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span>View League</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderJoinLeague = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Join a League</h1>
        <p className="text-gray-600">Create a league, browse public leagues, or join with a code</p>
        <div className="flex space-x-1 mt-4 bg-neutral-100 p-1 rounded-lg max-w-lg">
          <div className="flex-1 py-2 px-3 rounded-md text-sm text-neutral-600 text-center">Create League</div>
          <div className="flex-1 py-2 px-3 rounded-md text-sm font-medium bg-white text-royalBlue shadow-sm border border-royalBlue text-center">Public Leagues</div>
          <div className="flex-1 py-2 px-3 rounded-md text-sm text-neutral-600 text-center">Join with Code</div>
        </div>
      </div>

      {/* Available Leagues */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Available Leagues</h2>
        <div className="space-y-4">
                      {sampleData.leagues.map((league: any, index: number) => (
            <div
              key={league.id}
              className={`border rounded-lg p-4 transition-all ${
                index === 0 && currentStepData.target === 'join-tutorial-league'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{league.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{league.description}</p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>{league.members}/{league.maxMembers}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4 flex-shrink-0" />
                      <span>{league.entryFee} gems buy-in</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 flex-shrink-0" />
                      <span>{league.prizePool} gem prize pool</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{league.start_date}</span>
                    </div>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <button
                    id={index === 0 ? 'join-tutorial-league' : ''}
                    onClick={() => {
                      if (index === 0) {
                        handleTargetClick('join-tutorial-league');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                      index === 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={index !== 0}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLeague = () => (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen">
      <h1 className="text-4xl lg:text-5xl font-extrabold text-neutral-900 mb-8 text-center tracking-tight font-serif drop-shadow relative">
        Tutorial Champions League
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-royalBlue to-gold rounded-full"></div>
      </h1>

      <div className="space-y-6 lg:space-y-8 px-4">
        {/* League Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <Users className="h-8 w-8 text-royalBlue mx-auto mb-2" />
            <div className="text-2xl font-bold text-neutral-900">8</div>
            <div className="text-sm text-neutral-600">Members</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <Trophy className="h-8 w-8 text-gold mx-auto mb-2" />
            <div className="text-2xl font-bold text-neutral-900">0 gems</div>
            <div className="text-sm text-neutral-600">Buy-in</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-neutral-900">Beginner</div>
            <div className="text-sm text-neutral-600">Difficulty</div>
          </div>
        </div>


        {/* Marketplace Section - Only show AFTER start marketplace is clicked */}
                  {(currentStepData.page === 'league' && (currentStepData.id === 'marketplace-start' || 
                    currentStepData.target === 'buy-magnus' || currentStepData.target === 'buy-ding')) && (
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-200 max-h-[80vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
              <div className="text-lg font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded">
                Coins: {currentStepData.target === 'buy-ding' ? '0' : '50'} 🪙
              </div>
            </div>
            
            {/* Current Turn Status */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Current Turn</h4>
              <div className="space-y-2">
                  <p className="text-sm">
                    Turn {currentStepData.target === 'buy-ding' ? '3' : '1'} of 20
                  </p>
                  <p className="text-sm">
                    <span className="text-green-600 font-semibold">It's your turn!</span>
                  </p>
                  <p className="text-sm">
                    Your team: {currentStepData.target === 'buy-ding' ? '1' : '0'}/10 players
                  </p>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg mb-6 border border-yellow-200 text-sm text-yellow-800">
              50 coins for the draft. Gems buy leagues, avatars, and prizes.
            </div>

            {/* Available Players */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Available Players</h4>
                          <div className="text-sm text-gray-600">
                            {currentStepData.target === 'buy-ding' ? '0 affordable • 2 total' : '3 affordable • 3 total'}
                          </div>
              </div>
              
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search players..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
              </div>

              {/* Players List */}
              <div className="space-y-3 max-h-96 overflow-y-auto overflow-x-hidden">
                {/* Magnus Carlsen - Show as purchased in team-building step */}
                {currentStepData.target === 'buy-ding' ? (
                  <div className="p-4 border rounded-lg bg-green-50 border-green-300 opacity-75">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-green-700">Magnus Carlsen ✓</span>
                        <span className="text-green-600 ml-2">ELO: 2850 • Purchased</span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-700">OWNED</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`p-4 border rounded-lg transition-shadow duration-300 ease-in-out hover:shadow-lg ${
                      currentStepData.target === 'buy-magnus'
                        ? 'border-blue-500 bg-blue-50 shadow-lg animate-pulse'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Magnus Carlsen</span>
                        <span className="text-gray-500 ml-2">ELO: 2850</span>
                      </div>
                      <div className="text-right relative">
                        <div className="text-lg font-bold text-green-600">50 coins</div>
                        <button 
                          id="buy-magnus"
                          onClick={() => handleTargetClick('buy-magnus')}
                          className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ease-in-out ${
                            currentStepData.target === 'buy-magnus'
                              ? 'bg-green-600 text-white ring-4 ring-green-300 ring-opacity-50'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          Buy Player
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Fabiano Caruana</span>
                      <span className="text-gray-500 ml-2">ELO: 2780</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">15 coins</div>
                      <button className="mt-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
                        Click to select
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg transition-all duration-300 ease-in-out ${
                    currentStepData.target === 'buy-ding'
                      ? 'border-blue-500 bg-blue-50 shadow-lg animate-pulse hover:shadow-lg'
                      : currentStepData.target === 'buy-magnus'
                      ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`font-medium ${
                        currentStepData.target === 'buy-magnus'
                          ? 'text-gray-400'
                          : 'text-gray-900'
                      }`}>Ding Liren</span>
                      <span className={`ml-2 ${
                        currentStepData.target === 'buy-magnus'
                          ? 'text-gray-400'
                          : 'text-gray-500'
                      }`}>ELO: 2750</span>
                    </div>
                    <div className="text-right relative">
                      <div className={`text-lg font-bold ${
                        currentStepData.target === 'buy-magnus'
                          ? 'text-gray-400'
                          : 'text-green-600'
                      }`}>15 coins</div>
                      <button 
                        id="buy-ding"
                        onClick={() => currentStepData.target === 'buy-ding' && handleTargetClick('buy-ding')}
                        disabled={currentStepData.target === 'buy-magnus'}
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out ${
                          currentStepData.target === 'buy-ding'
                            ? 'bg-green-600 text-white ring-4 ring-green-300 ring-opacity-50'
                            : currentStepData.target === 'buy-magnus'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {currentStepData.target === 'buy-magnus' ? 'Locked' : 'Buy Player'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User's Team */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Your Team ({currentStepData.target === 'buy-ding' ? '1' : '0'}/10)</h4>
                {currentStepData.target === 'buy-ding' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <span className="font-medium">Magnus Carlsen</span>
                        <span className="text-gray-500 ml-2">ELO: 2850</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">You haven't drafted any players yet.</div>
                )}
              </div>

            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              0 coins left? You're pulled from the rest of the draft.
            </div>
          </div>
        )}

        {/* Start Marketplace Button */}
        {currentStepData.target === 'start-marketplace-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Start the draft</h3>
            <p className="text-neutral-600 mb-4">This begins the snake draft.</p>
            <div className="relative">
              <button
                id="start-marketplace-button"
                onClick={() => handleTargetClick('start-marketplace-button')}
                className={`inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                  currentStepData.target === 'start-marketplace-button'
                    ? 'ring-4 ring-green-300 ring-opacity-50 animate-pulse'
                    : ''
                }`}
              >
                <Store className="w-5 h-5" />
                <span>Start Turn-Based Marketplace</span>
              </button>
            </div>
          </div>
        )}


        {/* Your Team Section - shown after marketplace */}
        {(currentStepData.target === 'set-lineup-button' || currentStepData.target === 'save-lineup-button') && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Your Team</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-medium">Magnus Carlsen</span>
                  <span className="text-gray-500 ml-2">ELO: 2850</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-medium">Fabiano Caruana</span>
                  <span className="text-gray-500 ml-2">ELO: 2780</span>
                </div>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <span className="font-medium">Ding Liren</span>
                  <span className="text-gray-500 ml-2">ELO: 2750</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Lineup Section */}
        {currentStepData.target === 'set-lineup-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg lg:text-xl font-bold text-neutral-900">Current Lineup</h3>
              <button
                id="set-lineup-button"
                onClick={() => handleTargetClick('set-lineup-button')}
                className={`flex items-center space-x-1 text-royalBlue hover:text-purple text-sm lg:text-base transition-colors ${
                  currentStepData.target === 'set-lineup-button'
                    ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse rounded px-2 py-1'
                    : ''
                }`}
              >
                Edit
              </button>
            </div>
            <div className="text-center py-8 text-neutral-500">
              <p>No lineup set for this week</p>
            </div>
          </div>
        )}

        {/* Lineup Selection Interface */}
        {currentStepData.target === 'save-lineup-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-blue-200">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-gray-900">Set Your Lineup</h3>
            <p className="text-gray-600 mb-6">Who plays this week.</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border-2 border-blue-500 bg-blue-50 rounded-lg">
                  <div className="font-medium">Magnus Carlsen</div>
                  <div className="text-sm text-gray-500">ELO: 2850 • Selected</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-medium">Fabiano Caruana</div>
                  <div className="text-sm text-gray-500">ELO: 2780</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-medium">Ding Liren</div>
                  <div className="text-sm text-gray-500">ELO: 2750</div>
                </div>
              </div>
              
              <div className="text-center pt-4">
                <div className="relative">
                  <button
                    id="save-lineup-button"
                    onClick={() => handleTargetClick('save-lineup-button')}
                    className={`bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                      currentStepData.target === 'save-lineup-button'
                        ? 'ring-4 ring-green-300 ring-opacity-50 animate-pulse'
                        : ''
                    }`}
                  >
                    Save Lineup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );


  const renderLeaderboardMiniSite = () => {
    const onLeaderboardStep = currentStepData.id === 'leaderboard';
    const showingLeaderboard = !onLeaderboardStep || miniLeaderboardOpen;

    return (
      <TutorialMiniSite
        path={showingLeaderboard ? '/leaderboard' : '/league'}
        highlightLeaderboard={onLeaderboardStep && !miniLeaderboardOpen}
        leaderboardActive={showingLeaderboard}
        onLeaderboardClick={() => handleTargetClick('mini-leaderboard-link')}
      >
        {showingLeaderboard ? renderLeaderboard() : renderMiniLeaguePage()}
      </TutorialMiniSite>
    );
  };

  const renderMiniLeaguePage = () => (
    <div className="bg-white p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 mb-6 text-center tracking-tight font-serif relative">
        Tutorial Champions League
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-royalBlue to-gold rounded-full"></div>
      </h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-3 border-2 border-gold text-center">
          <Users className="h-5 w-5 text-royalBlue mx-auto mb-1" />
          <div className="text-lg font-bold text-neutral-900">8</div>
          <div className="text-xs text-neutral-600">Members</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border-2 border-gold text-center">
          <Trophy className="h-5 w-5 text-gold mx-auto mb-1" />
          <div className="text-lg font-bold text-neutral-900">0 gems</div>
          <div className="text-xs text-neutral-600">Buy-in</div>
        </div>
        <div className="bg-white rounded-lg shadow p-3 border-2 border-gold text-center">
          <Target className="h-5 w-5 text-green-600 mx-auto mb-1" />
          <div className="text-lg font-bold text-neutral-900">Beginner</div>
          <div className="text-xs text-neutral-600">Difficulty</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border-2 border-gold mb-4">
        <h2 className="text-base font-bold mb-3 text-neutral-900">Standings</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-royalBlue bg-opacity-10 border border-royalBlue">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-royalBlue text-white">1</div>
              <span className="font-semibold text-sm text-neutral-900">You</span>
            </div>
            <div className="font-semibold text-sm text-neutral-900">12.50 pts</div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-neutral-300 text-neutral-700">2</div>
              <span className="font-medium text-sm">ChessWizard92</span>
            </div>
            <div className="font-semibold text-sm text-neutral-900">11.90 pts</div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-50">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-neutral-300 text-neutral-700">3</div>
              <span className="font-medium text-sm">KnightRider</span>
            </div>
            <div className="font-semibold text-sm text-neutral-900">11.50 pts</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border-2 border-gold">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-neutral-900">Current Lineup</h3>
          <span className="text-sm text-royalBlue">Edit</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-50 rounded-lg p-2 text-center border border-gold">
            <div className="text-xs font-medium">Magnus Carlsen</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-2 text-center border border-gold">
            <div className="text-xs font-medium">Fabiano Caruana</div>
          </div>
          <div className="bg-neutral-50 rounded-lg p-2 text-center border border-gold">
            <div className="text-xs font-medium">Ding Liren</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="bg-gradient-to-br from-blue-600 to-purple-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <Trophy className="w-10 h-10 mr-3 text-yellow-500" />
            Fantasy Chess Leaderboards
          </h1>
          <p className="text-white/80 text-lg">Track the best players across all leagues</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white text-blue-600">
              <Crown className="w-4 h-4" />
              League Wins
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:bg-white/20">
              <Target className="w-4 h-4" />
              Total Points
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:bg-white/20">
              Recent Winners
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:bg-white/20">
              Weekly Top Performers
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Crown className="w-6 h-6 mr-2 text-yellow-500" />
              Most League Wins
            </h2>
            <div className="space-y-4">
              {sampleData.leaderboard.map((entry: any, index: number) => (
                <div key={entry.user_id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-center w-6 sm:w-8 flex-shrink-0">
                    {index === 0 ? <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" /> :
                     index === 1 ? <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" /> :
                     index === 2 ? <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" /> :
                     <span className="text-base sm:text-lg font-bold text-gray-600">{index + 1}</span>}
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-500 bg-gray-200 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg truncate">{entry.username}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">{entry.total_leagues} leagues played</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg sm:text-2xl font-bold text-yellow-500 whitespace-nowrap">{entry.wins} wins</div>
                    <div className="text-xs sm:text-sm text-gray-600">0 gems</div>
                  </div>
                </div>
              ))}
            </div>

            {activeTarget === 'next-step-button' && (
              <div className="text-center pt-6 mt-6 border-t border-gray-100">
                <button
                  id="next-step-button"
                  onClick={() => handleTargetClick('next-step-button')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ring-2 ring-blue-300 animate-pulse"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600">Track your Fantasy Chess journey</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">1,250</div>
          <div className="text-sm text-gray-600">Total Points</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Target className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">3</div>
          <div className="text-sm text-gray-600">Leagues Joined</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <Medal className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">2</div>
          <div className="text-sm text-gray-600">Wins</div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Achievements</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-900 font-medium">Completed Tutorial</span>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Trophy className="w-5 h-5 text-blue-600" />
            <span className="text-blue-900 font-medium">First League Joined</span>
          </div>
        </div>
      </div>

      {/* Start Playing Button */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <div className="relative">
          <button
            id="start-playing-button"
            onClick={() => handleTargetClick('start-playing-button')}
            className={`inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-bold shadow-lg transition-colors ${
              currentStepData.target === 'start-playing-button'
                ? 'ring-4 ring-green-300 ring-opacity-50 animate-pulse'
                : ''
            }`}
          >
            <Trophy className="w-6 h-6" />
            <span>Start Playing</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 fixed top-16 left-0 right-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-sm">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Fantasy Chess Tutorial
              </h1>
            </div>
            <button
              onClick={handleSkipTutorial}
              className="text-gray-500 hover:text-gray-700 flex items-center space-x-1 relative z-50 transition-colors duration-200 hover:bg-gray-100 px-3 py-2 rounded-lg"
            >
              <X className="w-4 h-4" />
              <span>Skip Tutorial</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tutorial Steps - Mobile Dropdown / Desktop Sidebar */}
          <div id="tutorial-sidebar" className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 p-6">
              {/* Mobile: Collapsible Header */}
              <button
                onClick={() => setShowStepsDropdown(!showStepsDropdown)}
                className="lg:hidden w-full flex items-center justify-between mb-6 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Tutorial Progress
                  </h2>
                </div>
                {showStepsDropdown ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {/* Desktop: Static Header */}
              <div className="hidden lg:flex items-center mb-6">
                <Target className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Tutorial Progress
                </h2>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </p>
              </div>

              {/* Mobile: Collapsible Content */}
              <div className={`lg:block ${showStepsDropdown ? 'block' : 'hidden'}`}>
                <div className="space-y-3 max-h-[60vh] lg:max-h-none overflow-y-auto">
                  {tutorialSteps.map((step, index) => (
                    <div
                      key={step.id}
                      onClick={() => {
                        if (index !== currentStep) {
                          setCurrentStep(index);
                          setCurrentPage(step.page);
                          setShowStepsDropdown(false);
                        }
                      }}
                      className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        index === currentStep
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 shadow-sm'
                          : index < currentStep
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium shadow-sm flex-shrink-0 ${
                          index === currentStep
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                            : index < currentStep
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          index === currentStep ? 'text-blue-900' : 
                          index < currentStep ? 'text-green-900' : 'text-gray-700'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{step.page}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div id="tutorial-main-panel" className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 p-8">
              <TutorialCallout
                key={`${currentStepData.id}-${activeTarget}`}
                targetId={activeTarget}
                title={currentStepData.title}
                description={
                  currentStepData.id === 'leaderboard' && miniLeaderboardOpen
                    ? 'Wins, points, and weekly leaders across every league.'
                    : currentStepData.description
                }
                action={
                  currentStepData.id === 'leaderboard' && miniLeaderboardOpen
                    ? 'Click Next'
                    : currentStepData.action
                }
                stepNumber={currentStep + 1}
                totalSteps={tutorialSteps.length}
              />

              {/* Render current page */}
              <div className="relative z-50">
                {renderCurrentPage()}
              </div>

              {/* Step Counter */}
              <div className="flex justify-center items-center mt-8 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-full">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveTutorial;
