import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trophy, Users, Target, Coins, Store, CheckCircle, Crown, Calendar, Plus, Medal, User, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

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
      description: 'Welcome to your league! Here you can see all participants, league settings, and current standings. The turn-based marketplace is ready to begin!',
      action: 'Click "Start Marketplace" to begin selecting players',
      target: 'start-marketplace-button',
      page: 'league'
    },
    {
      id: 'marketplace-start',
      title: 'Turn-Based Marketplace Begins!',
      description: 'This is Phase 1 - the Turn-Based Marketplace! You start with 50 GEMS and take turns selecting players. High-rated players like Magnus Carlsen cost 50 GEMS. After the turn-based marketplace, you\'ll get 50 coins per week for trading.',
      action: 'Click "Buy Player" on Magnus Carlsen',
      target: 'buy-magnus',
      page: 'league'
    },
    {
      id: 'team-building',
      title: 'Building Your Team',
      description: 'Great choice! You now have Magnus Carlsen and 0 GEMS remaining. The draft continues until all players are taken or everyone runs out of GEMS. Then Phase 2 begins with weekly trading.',
      action: 'Click "Buy Player" on Ding Liren',
      target: 'buy-ding',
      page: 'league'
    },
    {
      id: 'marketplace-complete',
      title: 'Marketplace Complete!',
      description: 'The turn-based marketplace is finished! Your team: Magnus Carlsen, Fabiano Caruana, Ding Liren. Now you need to set your weekly lineup to start competing.',
      action: 'Click "Set Lineup" to choose your starting players',
      target: 'set-lineup-button',
      page: 'league'
    },
    {
      id: 'lineup-selection',
      title: 'Setting Your Lineup',
      description: 'Choose which players from your team will compete this week. You can change your lineup before each round starts.',
      action: 'Click "Save Lineup" to confirm your selection',
      target: 'save-lineup-button',
      page: 'league'
    },
      {
        id: 'scoring-system',
        title: 'Understanding Scoring',
        description: 'After each tournament round, your players earn points based on their performance. You can use these points to draft additional players or trade existing ones.',
        action: 'Click "View League Standings" to see your league rankings',
        target: 'view-league-standings-button',
        page: 'league'
      },
      {
        id: 'league-standings',
        title: 'League Standings',
        description: 'Here you can see how you rank against other players in your specific league. Your position is based on total points earned from your lineups.',
        action: 'Click "View Global Leaderboard" to see rankings across all leagues',
        target: 'view-global-leaderboard-button',
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
      id: 'bots-explanation',
      title: 'Understanding Bots',
      description: 'Fantasy Chess includes AI bots that serve as competitors when leagues don\'t have enough human players. Bots draft players automatically, set lineups, and compete just like human players. They ensure leagues always have full competition!',
      action: 'Click "Next" to learn about league mechanics',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'league-mechanics',
      title: 'How Leagues Work',
      description: 'Leagues run for one month (from start date to end of month) with weekly rounds. Each Tuesday, titled tournaments provide real games for scoring. You win by having the highest total points at the end. Entry fees create prize pools for winners!',
      action: 'Click "Next" to learn about game timing',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'game-timing',
      title: 'Game Schedule & Scoring',
      description: 'Games are based on real titled tournaments every Tuesday. Your players earn points based on their actual tournament performance. Points are calculated using ACL (Average Centipawn Loss) - a measure of chess accuracy where lower values mean more precise play!',
      action: 'Click "Next" to learn about marketplace trading',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'normal-marketplace',
      title: 'Normal Marketplace Trading',
      description: 'After the draft ends, you get 50 COINS (🪙) every week for trading. You can buy new players, sell current ones, or trade with other league members. Prices fluctuate based on player performance and demand!',
      action: 'Click "Next" to learn about currency types',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'currency-explanation',
      title: 'Two Types of Currency',
      description: 'Fantasy Chess uses TWO completely different currencies: GEMS (💎) are ONLY used during the turn-based marketplace draft phase - everyone gets exactly 50 GEMS to build their initial team. Once the draft ends, GEMS disappear forever. COINS (🪙) are your main currency for trading players throughout the entire season - you earn 50 COINS every week.',
      action: 'Click "Next" to learn about scoring formulas',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'scoring-formulas',
      title: 'Complete Scoring System',
      description: 'Fantasy points are calculated using a sophisticated formula that rewards both winning and playing quality. The main components are: Base Win Bonus (0.5 points), Surprise Bonus (2.0x multiplier), ACL Quality Bonus (8.0x multiplier), and Consistency Bonus (3.0x multiplier). Points are capped between -8 and +15.',
      action: 'Click "Next" to learn about snake draft',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'snake-draft-explanation',
      title: 'Snake Draft System',
      description: 'The snake draft ensures fair player selection by reversing the order each round. Round 1: Players pick 1→2→3→4. Round 2: Players pick 4→3→2→1. This continues for 10 rounds, giving everyone equal opportunity to get top players!',
      action: 'Click "Next" to complete the tutorial',
      target: 'next-step-button',
      page: 'leaderboard'
    },
    {
      id: 'profile',
      title: 'Tutorial Complete!',
      description: 'Congratulations! You\'ve completed the Fantasy Chess tutorial. Your profile shows your stats, achievements, and league history. You\'re now ready to join real leagues and compete against other players.',
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


  const handleTargetClick = (targetId: string) => {
    const currentStepData = tutorialSteps[currentStep];
    if (currentStepData.target === targetId) {
      // Special case: if this is the final step with "Start Playing" button, navigate to dashboard
      if (targetId === 'start-playing-button' && currentStep === tutorialSteps.length - 1) {
        navigate('/dashboard');
        return;
      }
      handleNext();
      
      // Auto-scroll to furthest point up that changed (main content area) when moving to next section (but not for marketplace purchases)
      if (!targetId.includes('buy-')) {
        setTimeout(() => {
          // Find the main content container (furthest point up that changed)
          const mainContent = document.querySelector('.max-w-7xl');
          if (mainContent) {
            const contentTop = mainContent.getBoundingClientRect().top + window.scrollY - 20; // 20px offset for padding
            window.scrollTo({ top: Math.max(0, contentTop), behavior: 'smooth' });
          } else {
            // Fallback: scroll to top of main content area (after header)
            const headerHeight = 200; // Approximate header height
            window.scrollTo({ top: headerHeight, behavior: 'smooth' });
          }
        }, 200);
      }
    }
  };

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
        return renderLeaderboard();
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
        <p className="text-gray-600">Choose from available leagues or create your own</p>
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
                      <span>${league.entryFee}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 flex-shrink-0" />
                      <span>${league.prizePool}</span>
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
            <div className="text-2xl font-bold text-neutral-900">$0</div>
            <div className="text-sm text-neutral-600">Prize Pool</div>
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
          <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-blue-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Turn-Based Marketplace</h3>
              <div className="text-lg font-semibold text-amber-700 bg-amber-100 px-4 py-2 rounded">
                GEMS: {currentStepData.target === 'buy-ding' ? '0' : '50'} 💎
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

            {/* Marketplace Explanation */}
            <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2">📚 How the Marketplace Works</h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <p><strong>Phase 1 - Turn-Based Marketplace:</strong> You start with 50 GEMS and take turns selecting players. High-rated players like Magnus Carlsen cost 50 GEMS.</p>
                <p><strong>Phase 2 - Trading:</strong> After the turn-based marketplace, you get 50 coins per week to buy/sell/trade players in the regular marketplace.</p>
              </div>
            </div>

            {/* Available Players */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Available Players</h4>
                          <div className="text-sm text-gray-600">
                            {currentStepData.target === 'buy-ding' ? '1 affordable • 2 total' : '3 affordable • 3 total'}
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
                        <div className="text-lg font-bold text-green-600">50 GEMS</div>
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
                      <div className="text-lg font-bold text-green-600">45 GEMS</div>
                      <button className="mt-2 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed">
                        Click to select
                      </button>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 border rounded-lg transition-all duration-300 ease-in-out ${
                    currentStepData.target === 'buy-ding'
                      ? 'border-blue-500 bg-blue-50 shadow-lg animate-pulse hover:shadow-lg transform hover:scale-[1.02]'
                      : currentStepData.target === 'buy-magnus'
                      ? 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-lg transform hover:scale-[1.02]'
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
                      }`}>40 GEMS</div>
                      <button 
                        id="buy-ding"
                        onClick={() => currentStepData.target === 'buy-ding' && handleTargetClick('buy-ding')}
                        disabled={currentStepData.target === 'buy-magnus'}
                        className={`mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out ${
                          currentStepData.target === 'buy-ding'
                            ? 'bg-green-600 text-white ring-4 ring-green-300 ring-opacity-50 transform hover:scale-105'
                            : currentStepData.target === 'buy-magnus'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white transform hover:scale-105'
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

            {/* Auto-remove info */}
            <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
              <p className="text-orange-700 font-semibold">💡 Auto-Remove Feature</p>
              <p className="text-orange-600">Users with 0 GEMS are automatically removed from the draft entirely</p>
            </div>
          </div>
        )}

        {/* Start Marketplace Button */}
        {currentStepData.target === 'start-marketplace-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-gold text-center">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Ready to Start?</h3>
            <p className="text-neutral-600 mb-4">The turn-based marketplace is ready to begin!</p>
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
            </div>
          </div>
        )}


        {/* Your Team Section - shown after marketplace */}
        {(currentStepData.target === 'set-lineup-button' || currentStepData.target === 'save-lineup-button' || currentStepData.target === 'view-league-standings-button' || currentStepData.target === 'view-global-leaderboard-button') && (
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
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-neutral-900">Current Lineup</h3>
            <div className="text-center py-8 text-neutral-500">
              <p className="mb-4">No lineup set for this week</p>
              <div className="relative">
                <button 
                  id="set-lineup-button"
                  onClick={() => handleTargetClick('set-lineup-button')}
                  className={`bg-[#1e293b] hover:bg-royalBlue text-white px-4 py-2 rounded-lg shadow-lg transition-colors ${
                    currentStepData.target === 'set-lineup-button'
                      ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse'
                      : ''
                  }`}
                >
                  Set Lineup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lineup Selection Interface */}
        {currentStepData.target === 'save-lineup-button' && (
          <div className="bg-white rounded-lg shadow-lg p-4 lg:p-6 border-2 border-blue-200">
            <h3 className="text-lg lg:text-xl font-bold mb-4 text-gray-900">Set Your Lineup</h3>
            <p className="text-gray-600 mb-6">Select which players will compete this week. You can change your lineup before each round.</p>
            
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

        {/* Scoring System Explanation */}
        {currentStepData.target === 'view-league-standings-button' && (
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-green-200">
            <div className="text-center">
              <h3 className="text-xl font-bold text-green-600 mb-4">🎯 Understanding Scoring</h3>
              <p className="text-gray-600 mb-6">Your players earn points based on their tournament performance. Use these points to draft more players or make strategic trades!</p>
              
              <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
                <h4 className="font-semibold text-yellow-900 mb-2">💡 How Scoring Actually Works</h4>
                <div className="text-sm text-yellow-800 space-y-2">
                  <p><strong>Playing Quality (ACL):</strong> Rewards accurate moves vs average skill level</p>
                  <p><strong>Win Bonus:</strong> Small bonus (0.5 points) for winning games</p>
                  <p><strong>Surprise Factor:</strong> Extra points for beating higher-rated opponents</p>
                  <p><strong>Consistency Bonus:</strong> Rewards playing better than expected skill level</p>
                  <p><strong>Quality Focus:</strong> Emphasizes how well you play, not just winning</p>
                </div>
              </div>

                        <div className="relative">
                          <button
                            id="view-league-standings-button"
                            onClick={() => handleTargetClick('view-league-standings-button')}
                            className={`inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                              currentStepData.target === 'view-league-standings-button'
                                ? 'ring-4 ring-blue-300 ring-opacity-50 animate-pulse'
                                : ''
                            }`}
                          >
                            <Trophy className="w-5 h-5" />
                            <span>View League Standings</span>
                          </button>
                        </div>
            </div>
          </div>
        )}

          {/* League Standings Section */}
          {currentStepData.target === 'view-global-leaderboard-button' && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-yellow-500">
              <div className="text-center">
                <h3 className="text-xl font-bold text-yellow-600 mb-4">🏆 League Standings</h3>
                <p className="text-gray-600 mb-6">Current rankings in Tutorial Champions League</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-500">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                      <span className="font-semibold text-blue-900">You</span>
                    </div>
                    <div className="font-bold text-blue-600">1250 pts</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">2</div>
                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                      <span className="font-medium">ChessWizard92</span>
                    </div>
                    <div className="font-bold text-gray-600">1190 pts</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                      <span className="font-medium">KnightRider 🤖</span>
                    </div>
                    <div className="font-bold text-gray-600">1150 pts</div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    id="view-global-leaderboard-button"
                    onClick={() => handleTargetClick('view-global-leaderboard-button')}
                    className={`inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-black px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
                      currentStepData.target === 'view-global-leaderboard-button'
                        ? 'ring-4 ring-purple-300 ring-opacity-50 animate-pulse'
                        : ''
                    }`}
                  >
                    <Trophy className="w-5 h-5" />
                    <span>View Global Leaderboard</span>
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );


  const renderLeaderboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-900">
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
            {/* Tutorial Content Based on Current Step */}
            {currentStepData.id === 'bots-explanation' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Understanding Bots</h2>
                <div className="max-w-2xl mx-auto space-y-4 text-gray-700">
                  <p>Fantasy Chess includes AI bots that serve as competitors when leagues don't have enough human players.</p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">How Bots Work:</h3>
                    <ul className="text-left space-y-2">
                      <li>• Bots draft players automatically using smart algorithms</li>
                      <li>• They set competitive lineups each week</li>
                      <li>• They compete just like human players</li>
                      <li>• They ensure leagues always have full competition</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">Bots make leagues more exciting and ensure you always have opponents to compete against!</p>
                </div>
              </div>
            )}

            {currentStepData.id === 'league-mechanics' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">How Leagues Work</h2>
                <div className="max-w-2xl mx-auto space-y-4 text-gray-700">
                  <p>Leagues are competitive tournaments that run for <strong>one month</strong> (from start date to end of month) with weekly scoring rounds.</p>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">League Structure:</h3>
                    <ul className="text-left space-y-2">
                      <li>• <strong>Duration:</strong> One month (start date to end of month)</li>
                      <li>• <strong>Team Size:</strong> 10 players per team (drafted)</li>
                      <li>• <strong>Lineup:</strong> 5 players compete each week</li>
                      <li>• <strong>Scoring:</strong> Weekly rounds based on real tournaments</li>
                      <li>• <strong>Winning:</strong> Highest total points at the end</li>
                      <li>• <strong>Prizes:</strong> Entry fees create prize pools for winners</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">Each league has different entry fees, prize pools, and difficulty levels!</p>
                </div>
              </div>
            )}

            {currentStepData.id === 'game-timing' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Game Schedule & Scoring</h2>
                <div className="max-w-2xl mx-auto space-y-4 text-gray-700">
                  <p>Games are based on real titled tournaments that happen every Tuesday.</p>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Scoring System:</h3>
                    <ul className="text-left space-y-2">
                      <li>• <strong>Tournaments:</strong> Real titled tournaments every Tuesday</li>
                      <li>• <strong>Scoring:</strong> Based on actual tournament performance</li>
                      <li>• <strong>ACL:</strong> Average Centipawn Loss (lower is better)</li>
                      <li>• <strong>Points:</strong> Calculated from player's real game results</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">Your players earn points based on their actual chess performance in real tournaments!</p>
                </div>
              </div>
            )}

            {currentStepData.id === 'normal-marketplace' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">Normal Marketplace Trading</h2>
                <div className="max-w-2xl mx-auto space-y-4 text-gray-700">
                  <p>After the draft, you get 50 coins weekly for trading and managing your team.</p>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Trading Features:</h3>
                    <ul className="text-left space-y-2">
                      <li>• <strong>Buy:</strong> Purchase new players with your weekly coins</li>
                      <li>• <strong>Sell:</strong> Trade current players for coins</li>
                      <li>• <strong>Trade:</strong> Exchange players with other league members</li>
                      <li>• <strong>Prices:</strong> Fluctuate based on performance and demand</li>
                    </ul>
                  </div>
                  <p className="text-sm text-gray-600">Strategic trading can give you an edge over your competitors!</p>
                </div>
              </div>
            )}

            {/* Default Leaderboard Content */}
            {!['bots-explanation', 'league-mechanics', 'game-timing', 'normal-marketplace'].includes(currentStepData.id) && (
              <>
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
                        <div className="text-xs sm:text-sm text-gray-600">$0</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Next Step Button for Tutorial Steps */}
      {['bots-explanation', 'league-mechanics', 'game-timing', 'normal-marketplace', 'currency-explanation', 'scoring-formulas', 'snake-draft-explanation'].includes(currentStepData.id) && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center mb-4">
          <div className="relative">
            <button
              id="next-step-button"
              onClick={() => handleTargetClick('next-step-button')}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg ${
                currentStepData.target === 'next-step-button' ? 'ring-2 ring-blue-300 animate-pulse' : ''
              }`}
            >
              Next Step
            </button>
          </div>
        </div>
      )}

      {/* View Profile Button */}
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center">
        <div className="relative">
          <button
            id="view-profile-button"
            onClick={() => handleTargetClick('view-profile-button')}
            className={`inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-black px-6 py-3 rounded-lg font-semibold shadow-lg transition-colors ${
              currentStepData.target === 'view-profile-button'
                ? 'ring-4 ring-purple-300 ring-opacity-50 animate-pulse'
                : ''
            }`}
          >
            <User className="w-5 h-5" />
            <span>View Profile</span>
          </button>
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
          <div className="lg:col-span-1 order-2 lg:order-1">
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
          <div className="lg:col-span-2 order-1 lg:order-2">
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
    </div>
  );
};

export default ComprehensiveTutorial;
