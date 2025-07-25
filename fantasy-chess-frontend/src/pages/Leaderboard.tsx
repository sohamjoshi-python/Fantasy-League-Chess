import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import pawnRoyaleLogo from '../assets/pawn-royale-logo.png';
import { Trophy, Target, Clock, Calendar, Medal, Crown } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  wins?: number;
  total_points?: number;
  total_leagues?: number;
  total_prize_money?: number;
  leagues_played?: number;
  average_points_per_league?: number;
  avatar_url?: string;
}

interface RecentWinner {
  user_id: string;
  username: string;
  league_name: string;
  prize_amount: number;
  won_date: string;
  avatar_url?: string;
}

interface WeeklyPerformer {
  user_id: string;
  username: string;
  league_name: string;
  week_points: number;
  avatar_url?: string;
}

type LeaderboardType = 'wins' | 'points' | 'recent' | 'weekly';

const Leaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<LeaderboardType>('wins');
  const [winsData, setWinsData] = useState<LeaderboardEntry[]>([]);
  const [pointsData, setPointsData] = useState<LeaderboardEntry[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [weeklyPerformers, setWeeklyPerformers] = useState<WeeklyPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    fetchAllLeaderboards();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyPerformers(selectedWeek);
    }
  }, [selectedWeek]);

  const fetchAllLeaderboards = async () => {
    setLoading(true);
    try {
      // Fetch league wins leaderboard
      const { data: winsData } = await supabase.rpc('get_league_wins_leaderboard');
      setWinsData(winsData || []);

      // Fetch total points leaderboard
      const { data: pointsData } = await supabase.rpc('get_total_points_leaderboard');
      setPointsData(pointsData || []);

      // Fetch recent winners
      const { data: recentData } = await supabase.rpc('get_recent_winners');
      setRecentWinners(recentData || []);

      // Set default week to current week
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      const weekString = monday.toISOString().split('T')[0];
      setSelectedWeek(weekString);

    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyPerformers = async (weekDate: string) => {
    try {
      const { data } = await supabase.rpc('get_weekly_top_performers', { week_date: weekDate });
      setWeeklyPerformers(data || []);
    } catch (error) {
      console.error('Error fetching weekly performers:', error);
    }
  };

  const getWeekOptions = () => {
    const options = [];
    const today = new Date();
    
    // Generate options for the last 8 weeks
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (today.getDay() + 7 * i) + 1);
      const weekString = date.toISOString().split('T')[0];
      const weekLabel = `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      options.push({ value: weekString, label: weekLabel });
    }
    
    return options;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-lg font-bold text-neutral-600">{rank + 1}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-royalBlue to-purple-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading leaderboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-royalBlue to-purple-900">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center">
            <Trophy className="w-10 h-10 mr-3 text-gold" />
            Fantasy Chess Leaderboards
          </h1>
          <p className="text-white/80 text-lg">Track the best players across all leagues</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveTab('wins')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'wins'
                  ? 'bg-white text-royalBlue'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Crown className="w-4 h-4" />
              League Wins
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'points'
                  ? 'bg-white text-royalBlue'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Target className="w-4 h-4" />
              Total Points
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'bg-white text-royalBlue'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent Winners
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-white text-royalBlue'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Weekly Top Performers
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* League Wins Leaderboard */}
          {activeTab === 'wins' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Crown className="w-6 h-6 mr-2 text-gold" />
                Most League Wins
              </h2>
              {winsData.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <p>No league wins recorded yet.</p>
                  <p className="text-sm">Join leagues and start competing!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {winsData.map((entry, index) => (
                    <div key={entry.user_id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <img 
                        src={entry.avatar_url || pawnRoyaleLogo} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{entry.username}</h3>
                        <p className="text-sm text-neutral-600">
                          {entry.total_leagues} leagues played
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{entry.wins} wins</div>
                        <div className="text-sm text-neutral-600">
                          {formatCurrency(entry.total_prize_money || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Total Points Leaderboard */}
          {activeTab === 'points' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Target className="w-6 h-6 mr-2 text-gold" />
                Total Points Leaders
              </h2>
              {pointsData.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Target className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <p>No points recorded yet.</p>
                  <p className="text-sm">Set lineups and earn points!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pointsData.map((entry, index) => (
                    <div key={entry.user_id} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <img 
                        src={entry.avatar_url || pawnRoyaleLogo} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{entry.username}</h3>
                        <p className="text-sm text-neutral-600">
                          {entry.leagues_played} leagues • {entry.average_points_per_league?.toFixed(1)} avg/league
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{entry.total_points?.toFixed(1)} pts</div>
                        <div className="text-sm text-neutral-600">
                          {entry.average_points_per_league?.toFixed(1)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Winners */}
          {activeTab === 'recent' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Clock className="w-6 h-6 mr-2 text-gold" />
                Recent Winners (Last 30 Days)
              </h2>
              {recentWinners.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <p>No recent winners.</p>
                  <p className="text-sm">Leagues need to end to see winners here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentWinners.map((winner, index) => (
                    <div key={`${winner.user_id}-${winner.league_name}`} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center justify-center w-8">
                        <span className="text-lg font-bold text-neutral-600">{index + 1}</span>
                      </div>
                      <img 
                        src={winner.avatar_url || pawnRoyaleLogo} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{winner.username}</h3>
                        <p className="text-sm text-neutral-600">{winner.league_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gold">{formatCurrency(winner.prize_amount)}</div>
                        <div className="text-sm text-neutral-600">
                          {formatDate(winner.won_date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Weekly Top Performers */}
          {activeTab === 'weekly' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-gold" />
                  Weekly Top Performers
                </h2>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-royalBlue"
                >
                  {getWeekOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {weeklyPerformers.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-neutral-300" />
                  <p>No performances recorded for this week.</p>
                  <p className="text-sm">Set lineups and earn points!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {weeklyPerformers.map((performer, index) => (
                    <div key={`${performer.user_id}-${performer.league_name}`} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index)}
                      </div>
                      <img 
                        src={performer.avatar_url || pawnRoyaleLogo} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{performer.username}</h3>
                        <p className="text-sm text-neutral-600">{performer.league_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{performer.week_points.toFixed(1)} pts</div>
                        <div className="text-sm text-neutral-600">this week</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 