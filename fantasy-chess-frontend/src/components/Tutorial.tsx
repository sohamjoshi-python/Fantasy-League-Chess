import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, X, Trophy, Users, Target, Coins, Store, CheckCircle } from 'lucide-react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action?: string;
  target?: string;
  completed?: boolean;
}

interface SampleLeague {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  buyIn: number;
  memberIds: string[];
  marketplaceOrder: string[];
  currentMarketplaceTurn: number;
  marketplaceCompleted: boolean;
  teams: {
    [userId: string]: {
      playerIds: string[];
      coinBalance: number;
    };
  };
  players: any[];
}

const Tutorial: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(true);
  const [sampleLeague, setSampleLeague] = useState<SampleLeague | null>(null);
  const [userTeam, setUserTeam] = useState<string[]>([]);
  const [userCoins, setUserCoins] = useState(100);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [marketplaceCompleted, setMarketplaceCompleted] = useState(false);
  const navigate = useNavigate();

  // Sample league data with past chess data
  const initializeSampleLeague = () => {
    const sampleData: SampleLeague = {
      id: 'tutorial-league',
      name: 'Tutorial League',
      description: 'Learn how to play Fantasy Chess with this interactive tutorial',
      startDate: '2024-01-01',
      endDate: '2024-01-07', // 1 week instead of 1 month
      buyIn: 0, // Free tutorial
      memberIds: ['user', 'bot'],
      marketplaceOrder: ['user', 'bot'],
      currentMarketplaceTurn: 0,
      marketplaceCompleted: false,
      teams: {
        user: {
          playerIds: [],
          coinBalance: 100
        },
        bot: {
          playerIds: [],
          coinBalance: 100
        }
      },
      players: [
        { id: '1', name: 'Magnus Carlsen', elo: 2850, price: 25, country: 'Norway' },
        { id: '2', name: 'Fabiano Caruana', elo: 2800, price: 22, country: 'USA' },
        { id: '3', name: 'Ding Liren', elo: 2780, price: 20, country: 'China' },
        { id: '4', name: 'Ian Nepomniachtchi', elo: 2750, price: 18, country: 'Russia' },
        { id: '5', name: 'Hikaru Nakamura', elo: 2720, price: 16, country: 'USA' },
        { id: '6', name: 'Alireza Firouzja', elo: 2700, price: 15, country: 'France' },
        { id: '7', name: 'Wesley So', elo: 2680, price: 14, country: 'USA' },
        { id: '8', name: 'Levon Aronian', elo: 2660, price: 13, country: 'Armenia' },
        { id: '9', name: 'Anish Giri', elo: 2640, price: 12, country: 'Netherlands' },
        { id: '10', name: 'Maxime Vachier-Lagrave', elo: 2620, price: 11, country: 'France' }
      ]
    };
    setSampleLeague(sampleData);
    setUserCoins(100);
  };

  useEffect(() => {
    initializeSampleLeague();
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Fantasy Chess!',
      description: 'This tutorial will walk you through a complete league in just 5 minutes. You\'ll learn how to draft players, manage your team, and compete for points.',
      action: 'Click "Next" to start',
      target: 'next-button'
    },
    {
      id: 'league-overview',
      title: 'League Overview',
      description: 'You\'re in a tutorial league with 1 bot opponent. You both start with 100 coins to draft players. The goal is to build the best team!',
      action: 'Click "Next" to continue',
      target: 'next-button'
    },
    {
      id: 'draft-players',
      title: 'Draft Your Players',
      description: 'Click on a player to see their details and price. You can afford Magnus Carlsen (25 coins) or multiple cheaper players. Choose wisely!',
      action: 'Click on Magnus Carlsen',
      target: 'player-card-1'
    },
    {
      id: 'buy-player',
      title: 'Buy Your First Player',
      description: 'Great choice! Magnus Carlsen is the world champion. Click "Buy Player" to add him to your team.',
      action: 'Click "Buy Player"',
      target: 'buy-button'
    },
    {
      id: 'team-management',
      title: 'Manage Your Team',
      description: 'Perfect! You now have Magnus Carlsen on your team and 75 coins remaining. You can buy more players or wait for the bot\'s turn.',
      action: 'Click "Next" to see bot\'s turn',
      target: 'next-button'
    },
    {
      id: 'bot-turn',
      title: 'Bot\'s Turn',
      description: 'The bot automatically drafts players. Watch as it selects Fabiano Caruana and Ding Liren. The marketplace continues until everyone runs out of coins.',
      action: 'Click "Next" to continue',
      target: 'next-button'
    },
    {
      id: 'marketplace-complete',
      title: 'Marketplace Complete!',
      description: 'The draft is finished! Your team: Magnus Carlsen. Bot\'s team: Fabiano Caruana, Ding Liren. Now the real competition begins!',
      action: 'Click "Next" to see scoring',
      target: 'next-button'
    },
    {
      id: 'scoring-system',
      title: 'How Scoring Works',
      description: 'Players earn points based on their real-world chess performance. Wins = +10 points, Draws = +5 points, Losses = 0 points. Your team\'s total points determine your ranking.',
      action: 'Click "Next" to see final results',
      target: 'next-button'
    },
    {
      id: 'final-results',
      title: 'Tutorial Complete!',
      description: 'Congratulations! You\'ve learned the basics of Fantasy Chess. In real leagues, you can trade players, join multiple leagues, and compete for prizes.',
      action: 'Click "Start Playing" to join real leagues',
      target: 'start-playing-button'
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTutorial = () => {
    navigate('/join-league');
  };

  const handleStartPlaying = () => {
    navigate('/join-league');
  };

  const handleBuyPlayer = (playerId: string, price: number) => {
    if (userCoins >= price && sampleLeague) {
      setUserTeam([...userTeam, playerId]);
      setUserCoins(userCoins - price);
      
      // Update sample league
      const updatedLeague = {
        ...sampleLeague,
        teams: {
          ...sampleLeague.teams,
          user: {
            playerIds: [...userTeam, playerId],
            coinBalance: userCoins - price
          }
        }
      };
      setSampleLeague(updatedLeague);
    }
  };

  const currentStepData = tutorialSteps[currentStep];

  if (!showTutorial) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Fantasy Chess Tutorial</h1>
            </div>
            <button
              onClick={handleSkipTutorial}
              className="text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Skip Tutorial</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tutorial Steps */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Tutorial Progress</h2>
              <div className="space-y-2">
                {tutorialSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${
                      index === currentStep
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : index < currentStep
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <div className={`w-5 h-5 rounded-full ${
                        index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                      }`} />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        index === currentStep ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {currentStepData.title}
                </h2>
                <p className="text-gray-600 text-lg mb-6">
                  {currentStepData.description}
                </p>
                {currentStepData.action && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 font-medium">
                      💡 {currentStepData.action}
                    </p>
                  </div>
                )}
              </div>

              {/* Sample League Interface */}
              {sampleLeague && (
                <div className="space-y-6">
                  {/* League Info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{sampleLeague.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{sampleLeague.description}</p>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-gray-600">Duration: 1 week</span>
                      <span className="text-gray-600">Buy-in: Free</span>
                      <span className="text-gray-600">Players: 2</span>
                    </div>
                  </div>

                  {/* Your Team */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Your Team</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        {userTeam.length > 0 ? (
                          userTeam.map(playerId => {
                            const player = sampleLeague.players.find(p => p.id === playerId);
                            return (
                              <div key={playerId} className="bg-white rounded-lg p-2 text-sm">
                                <div className="font-medium">{player?.name}</div>
                                <div className="text-gray-600">{player?.elo} ELO</div>
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-gray-500">No players yet</span>
                        )}
                      </div>
                      <div className="text-sm text-green-700">
                        Coins: {userCoins}
                      </div>
                    </div>
                  </div>

                  {/* Available Players */}
                  {(currentStepData.id === 'draft-players' || currentStepData.id === 'buy-player') && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-3">Available Players</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sampleLeague.players.slice(0, 4).map((player, index) => (
                          <div
                            key={player.id}
                            id={currentStepData.target === 'player-card-1' && index === 0 ? 'player-card-1' : ''}
                            className={`bg-white rounded-lg p-3 border-2 ${
                              currentStepData.target === 'player-card-1' && index === 0
                                ? 'border-blue-500 shadow-lg'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900">{player.name}</div>
                                <div className="text-sm text-gray-600">{player.elo} ELO</div>
                                <div className="text-sm text-gray-500">{player.country}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-600">{player.price}</div>
                                <div className="text-xs text-gray-500">coins</div>
                              </div>
                            </div>
                            {currentStepData.id === 'buy-player' && index === 0 && (
                              <button
                                id="buy-button"
                                onClick={() => handleBuyPlayer(player.id, player.price)}
                                className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Buy Player
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bot's Team */}
                  <div className="bg-red-50 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2">Bot's Team</h3>
                    <div className="flex space-x-2">
                      {currentStep >= 5 ? (
                        <>
                          <div className="bg-white rounded-lg p-2 text-sm">
                            <div className="font-medium">Fabiano Caruana</div>
                            <div className="text-gray-600">2800 ELO</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-sm">
                            <div className="font-medium">Ding Liren</div>
                            <div className="text-gray-600">2780 ELO</div>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500">No players yet</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    currentStep === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-sm text-gray-500">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </div>

                {currentStep === tutorialSteps.length - 1 ? (
                  <button
                    id="start-playing-button"
                    onClick={handleStartPlaying}
                    className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <span>Start Playing</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="next-button"
                    onClick={handleNext}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
