import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Trophy, Users, Target, Coins, Store, CheckCircle, Crown, Calendar, Plus, ExternalLink, Search, Copy, Medal, Clock, ArrowRight, ArrowDown, ArrowUp, User, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [showTutorial, setShowTutorial] = useState(true);
  const [sampleData, setSampleData] = useState<any>(null);
  
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
      title: 'Welcome to Fantasy Chess!',
      description: 'This comprehensive tutorial will walk you through the complete Fantasy Chess experience. You\'ll learn how to join leagues, draft players, manage your team, and compete for glory!',
      action: 'Click the "Join a League" button below to start',
      target: 'join-league-button',
      page: 'dashboard'
    },
    {
      id: 'league-selection',
      title: 'Choose Your League',
      description: 'Here you can see all available leagues. The "Tutorial Champions League" is perfect for beginners - it\'s free and designed for learning!',
      action: 'Click "Join" on the Tutorial Champions League',
      target: 'join-tutorial-league',
      page: 'join-league'
    },
    {
      id: 'league-overview',
      title: 'League Overview',
      description: 'Welcome to your league! Here you can see all participants, league settings, and current standings. The marketplace (draft) is ready to begin!',
      action: 'Click "Start Marketplace" to begin drafting players',
      target: 'start-marketplace-button',
      page: 'league'
    },
    {
      id: 'marketplace-start',
      title: 'Turn-Based Marketplace (Draft) Begins!',
      description: 'This is Phase 1 - the Draft! You start with 50 coins and take turns selecting players. High-rated players like Magnus Carlsen cost 50 coins. After the draft, you\'ll get 50 coins per week for trading.',
      action: 'Click "Buy Player" on Magnus Carlsen',
      target: 'buy-magnus',
      page: 'league'
    },
    {
      id: 'team-building',
      title: 'Building Your Team',
      description: 'Great choice! You now have Magnus Carlsen and 0 coins remaining. The draft continues until all players are taken or everyone runs out of coins. Then Phase 2 begins with weekly trading.',
      action: 'Click "Buy Player" on Ding Liren',
      target: 'buy-ding',
      page: 'league'
    },
    {
      id: 'marketplace-complete',
      title: 'Marketplace Complete!',
      description: 'The draft is finished! Your team: Magnus Carlsen, Fabiano Caruana, Ding Liren. Now the real competition begins with weekly matches and scoring.',
      action: 'Click "View Leaderboard" to see global rankings',
      target: 'view-leaderboard-button',
      page: 'league'
    },
    {
      id: 'leaderboard',
      title: 'Global Leaderboards',
      description: 'Check out the leaderboards to see top performers across all leagues. You can compete for prizes and bragging rights!',
      action: 'Click "View Profile" to see your stats',
      target: 'view-profile-button',
      page: 'leaderboard'
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description: 'Your profile shows your stats, achievements, and league history. This is where you can track your Fantasy Chess journey!',
      action: 'Click "Start Playing" to join real leagues',
      target: 'start-playing-button',
      page: 'profile'
    },
    {
      id: 'complete',
      title: 'Tutorial Complete!',
      description: 'Congratulations! You\'ve completed the Fantasy Chess tutorial. You\'re now ready to join real leagues and compete against other players.',
      action: 'Click "Start Playing" to join real leagues',
      target: 'start-playing-button',
      page: 'profile'
    }
  ];

  const currentStepData = tutorialSteps[currentStep];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStep + 1];
      setCurrentStep(currentStep + 1);
      setCurrentPage(nextStep.page);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = tutorialSteps[currentStep - 1];
      setCurrentStep(currentStep - 1);
      setCurrentPage(prevStep.page);
    }
  };

  const handleTargetClick = (targetId: string) => {
    const currentStepData = tutorialSteps[currentStep];
    if (currentStepData.target === targetId) {
      // Special case: if this is the final step with "Start Playing" button, navigate to dashboard
      if (targetId === 'start-playing-button' && currentStep === tutorialSteps.length - 1) {
        navigate('/dashboard');
        return;
      }
      handleNext();
    }
  };

  const handleSkipTutorial = () => {
    navigate('/join-league');
  };

  const handleStartPlaying = () => {
    navigate('/join-league');
  };

  const handleJoinLeague = () => {
    setLeagueJoined(true);
    setCurrentPage('league');
  };

  const [userCoins, setUserCoins] = useState(100);
  const [userTeam, setUserTeam] = useState<string[]>([]);
  const [leagueJoined, setLeagueJoined] = useState(false);

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
        return renderLeaderboard();
      case 'profile':
        return renderProfile();
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen pt-24">
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
              {currentStepData.target === 'join-league-button' && (
                <div className="absolute -top-28 right-12 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap z-10 shadow-lg">
                  <div className="flex items-center">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    <span>Click here to start!</span>
                  </div>
                </div>
              )}
              <button
                id="join-league-button"
                onClick={() => handleTargetClick('join-league-button')}
                className={`inline-flex items-center space-x-2 bg-[#1e293b] hover:bg-royalBlue text-white px-4 lg:px-6 py-3 rounded-lg font-semibold transition-colors shadow-lg ${
                  currentStepData.target === 'join-league-button'
                    ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse'
                    : ''
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
              {currentStepData.target === 'view-league-button' && (
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                  Click to view your league!
                  <ArrowDown className="w-4 h-4 ml-1 inline" />
                </div>
              )}
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
        <p className="text-gray-600">Choose from available leagues or create your own</p>
      </div>

      {/* Available Leagues */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Available Leagues</h2>
        <div className="space-y-4">
          {sampleData.leagues.map((league, index) => (
            <div
              key={league.id}
              className={`border rounded-lg p-4 transition-all ${
                index === 0 && currentStepData.target === 'join-tutorial-league'
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{league.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{league.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{league.members}/{league.maxMembers}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Coins className="w-4 h-4" />
                      <span>${league.entryFee}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4" />
                      <span>${league.prizePool}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{league.start_date}</span>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <button
                    id={index === 0 ? 'join-tutorial-league' : ''}
                    onClick={() => {
                      if (index === 0) {
                        handleTargetClick('join-tutorial-league');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      index === 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={index !== 0}
                  >
                    Join
                  </button>
                  {currentStepData.target === 'join-tutorial-league' && index === 0 && (
                    <div className="absolute -top-12 right-0 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                      Click "Join" here!
                      <ArrowDown className="w-4 h-4 ml-1 inline" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLeague = () => (
    <div className="w-full max-w-6xl mx-auto bg-white min-h-screen pt-24">
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
            <div className="text-2xl font-bold text-neutral-900">$0</div>
            <div className="text-sm text-neutral-600">Prize Pool</div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-neutral-900">Beginner</div>
            <div className="text-sm text-neutral-600">Difficulty</div>
          </div>
        </div>

        {/* Your Team */}
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
          <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Your Team</h3>
          <div className="text-neutral-500 text-sm">You haven't drafted any players yet.</div>
        </div>

        {/* Current Lineup */}
        <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold">
          <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Current Lineup</h3>
          <div className="text-center py-8 text-neutral-500">
            <p className="mb-4">No lineup set for this week</p>
            <button className="bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg shadow-lg transition-colors">
              Set Lineup
            </button>
          </div>
        </div>

        {/* Marketplace Section */}
        {(currentStepData.page === 'league' && (currentStepData.target === 'start-marketplace-button' || 
          currentStepData.target === 'player-magnus' || currentStepData.target === 'buy-magnus' || 
          currentStepData.target === 'player-ding' || currentStepData.target === 'buy-ding')) && (
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
              <div className="text-lg font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded">
                Coins: {currentStepData.target === 'player-magnus' ? '50' : currentStepData.target === 'player-ding' ? '0' : '50'} 🪙
              </div>
            </div>
            
            {/* Current Turn Status */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">Current Turn</h4>
              <div className="space-y-2">
                <p className="text-sm">
                  Turn {currentStepData.target === 'player-magnus' ? '1' : currentStepData.target === 'player-ding' ? '3' : '1'} of 20
                </p>
                <p className="text-sm">
                  {currentStepData.target === 'player-magnus' || currentStepData.target === 'buy-magnus' ? (
                    <span className="text-green-600 font-semibold">It's your turn!</span>
                  ) : currentStepData.target === 'player-ding' || currentStepData.target === 'buy-ding' ? (
                    <span className="text-green-600 font-semibold">It's your turn!</span>
                  ) : (
                    <span className="text-gray-600">Waiting on someone else...</span>
                  )}
                </p>
                <p className="text-sm">
                  Your team: {currentStepData.target === 'player-ding' ? '1' : '0'}/10 players
                </p>
              </div>
            </div>

            {/* Marketplace Explanation */}
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">📚 How the Marketplace Works</h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <p><strong>Phase 1 - Draft:</strong> You start with 50 coins and take turns drafting players. High-rated players like Magnus Carlsen cost 50 coins.</p>
                <p><strong>Phase 2 - Trading:</strong> After the draft, you get 50 coins per week to buy/sell/trade players in the regular marketplace.</p>
              </div>
            </div>

            {/* Available Players */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Available Players</h4>
                <div className="text-sm text-gray-600">
                  {currentStepData.target === 'player-magnus' ? '3 affordable • 3 total' : currentStepData.target === 'player-ding' ? '1 affordable • 2 total' : '3 affordable • 3 total'}
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <div 
                  className={`p-4 border rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg transform hover:scale-[1.02] ${
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
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out transform hover:scale-105 ${
                          currentStepData.target === 'buy-magnus'
                            ? 'bg-green-600 text-white ring-4 ring-green-300 ring-opacity-50'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        Buy Player
                      </button>
                      {currentStepData.target === 'buy-magnus' && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                          <div className="flex items-center">
                            <ArrowDown className="w-4 h-4 mr-1" />
                            <span>Click "Buy Player"!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Fabiano Caruana</span>
                      <span className="text-gray-500 ml-2">ELO: 2780</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">45 coins</div>
                      <button className="mt-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
                        Click to select
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg transform hover:scale-[1.02] ${
                    currentStepData.target === 'buy-ding'
                      ? 'border-blue-500 bg-blue-50 shadow-lg animate-pulse'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">Ding Liren</span>
                      <span className="text-gray-500 ml-2">ELO: 2750</span>
                    </div>
                    <div className="text-right relative">
                      <div className="text-lg font-bold text-green-600">40 coins</div>
                      <button 
                        id="buy-ding"
                        onClick={() => handleTargetClick('buy-ding')}
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out transform hover:scale-105 ${
                          currentStepData.target === 'buy-ding'
                            ? 'bg-green-600 text-white ring-4 ring-green-300 ring-opacity-50'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        Buy Player
                      </button>
                      {currentStepData.target === 'buy-ding' && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                          <div className="flex items-center">
                            <ArrowDown className="w-4 h-4 mr-1" />
                            <span>Click "Buy Player"!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User's Team */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Your Team ({currentStepData.target === 'player-ding' ? '1' : '0'}/10)</h4>
              {currentStepData.target === 'player-ding' ? (
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

            {/* Auto-remove info */}
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <p className="text-orange-700 font-semibold">💡 Auto-Remove Feature</p>
              <p className="text-orange-600">Users with 0 coins are automatically removed from the draft entirely</p>
            </div>
          </div>
        )}

        {/* Start Marketplace Button */}
        {currentStepData.target === 'start-marketplace-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Ready to Draft?</h3>
            <p className="text-neutral-600 mb-4">The marketplace (draft) is ready to begin!</p>
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
                <span>Start Marketplace</span>
              </button>
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                Click to start drafting!
                <ArrowDown className="w-4 h-4 ml-1 inline" />
              </div>
            </div>
          </div>
        )}

        {/* Scroll Indicator for Start Marketplace Button */}
        {currentStepData.target === 'start-marketplace-button' && (
          <div className="fixed right-8 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-full z-20 shadow-lg animate-bounce">
            <ArrowDown className="w-6 h-6" />
          </div>
        )}

        {/* Marketplace Complete Section */}
        {currentStepData.target === 'view-leaderboard-button' && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-600 mb-4">🎉 Marketplace Complete!</h3>
              <p className="text-gray-600 mb-6">The draft is finished! Your team: Magnus Carlsen, Fabiano Caruana, Ding Liren. Now the real competition begins with weekly matches and scoring.</p>
              
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-green-900 mb-2">Your Final Team</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Magnus Carlsen</span>
                    <span className="text-gray-500">ELO: 2850</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Fabiano Caruana</span>
                    <span className="text-gray-500">ELO: 2780</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Ding Liren</span>
                    <span className="text-gray-500">ELO: 2750</span>
                  </div>
                </div>
              </div>

              <div className="relative">
                <button
                  id="view-leaderboard-button"
                  onClick={() => handleTargetClick('view-leaderboard-button')}
                  className={`inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                    currentStepData.target === 'view-leaderboard-button'
                      ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse'
                      : ''
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  <span>View Leaderboard</span>
                </button>
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
                  Click to see global rankings!
                  <ArrowDown className="w-4 h-4 ml-1 inline" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );


  const renderLeaderboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">Global Leaderboard</h1>
        <p className="text-gray-600">Top performers across all leagues</p>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {sampleData.leaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`p-4 rounded-lg ${
                entry.user_id === 'user'
                  ? 'border-2 border-blue-500 bg-blue-50'
                  : 'border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    {index < 3 ? (
                      <Medal className={`w-5 h-5 ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' : 'text-orange-500'
                      }`} />
                    ) : (
                      <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{entry.username}</div>
                    <div className="text-sm text-gray-600">{entry.total_leagues} leagues</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{entry.total_points} pts</div>
                  <div className="text-sm text-gray-500">{entry.wins} wins</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Profile Button */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <h3 className="text-lg font-semibold mb-4">Ready to see your profile?</h3>
        <div className="relative">
          <button
            id="view-profile-button"
            onClick={() => handleTargetClick('view-profile-button')}
            className={`inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
              currentStepData.target === 'view-profile-button'
                ? 'ring-4 ring-purple-300 ring-opacity-50 animate-pulse'
                : ''
            }`}
          >
            <User className="w-5 h-5" />
            <span>View Profile</span>
          </button>
          {currentStepData.target === 'view-profile-button' && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
              Click to see your stats!
              <ArrowDown className="w-4 h-4 ml-1 inline" />
            </div>
          )}
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
          {currentStepData.target === 'start-playing-button' && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap">
              Click to join real leagues!
              <ArrowDown className="w-4 h-4 ml-1 inline" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* Gray Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-40 pointer-events-none backdrop-blur-[1px]"></div>
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200/50 relative z-50">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tutorial Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 p-6">
              <div className="flex items-center mb-6">
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

              <div className="space-y-3">
                {tutorialSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-200 ${
                      index === currentStep
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 shadow-sm'
                        : index < currentStep
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium shadow-sm ${
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
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
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

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                  {currentStepData.title}
                </h2>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  {currentStepData.description}
                </p>
                {currentStepData.action && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 mb-6 shadow-sm">
                    <p className="text-blue-800 font-medium flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                      {currentStepData.action}
                    </p>
                  </div>
                )}
              </div>

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
  );
};

export default ComprehensiveTutorial;
