import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { resolveAvatarUrl } from '../lib/avatars';
import { Trophy, Target, Clock, Calendar, Medal, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString, getWeekStartMonday, addDaysToYmd } from '../lib/calendarDate';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  wins?: number;
  total_points?: number;
  points_won?: number;
  points_lost?: number;
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
  const [loading, setLoading] = useState(false);
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

      setSelectedWeek(getWeekStartMonday());

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

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!selectedWeek) return;
    setSelectedWeek(
      addDaysToYmd(selectedWeek, direction === 'prev' ? -7 : 7)
    );
  };
  
  const canNavigateNext = () => {
    if (!selectedWeek) return false;
    const nextWeek = addDaysToYmd(selectedWeek, 7);
    return nextWeek <= getLocalDateString();
  };
  
  const formatWeekDisplay = (weekDate: string) => {
    const date = new Date(`${weekDate}T12:00:00`);
    return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatGems = (amount: number) => {
    return `${Math.floor(amount)} 💎`;
  };

  const formatPoints = (amount?: number) => {
    return Number(amount || 0).toFixed(1);
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
                        src={resolveAvatarUrl(entry.avatar_url)} 
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
                          {formatGems(entry.total_prize_money || 0)}
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
                        src={resolveAvatarUrl(entry.avatar_url)} 
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
                        <div className="text-2xl font-bold text-gold">{formatPoints(entry.total_points)} pts</div>
                        <div className="mt-1 flex flex-wrap justify-end gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                            +{formatPoints(entry.points_won)} won
                          </span>
                          <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                            -{formatPoints(entry.points_lost)} lost
                          </span>
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
                        src={resolveAvatarUrl(winner.avatar_url)} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{winner.username}</h3>
                        <p className="text-sm text-neutral-600">{winner.league_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gold">{formatGems(winner.prize_amount)}</div>
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
              <div className="mb-6">
                <h2 className="text-2xl font-bold flex items-center mb-4">
                  <Calendar className="w-6 h-6 mr-2 text-gold" />
                  Weekly Top Performers
                </h2>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="px-4 py-2 bg-royalBlue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Previous Week
                  </button>
                  <div className="px-6 py-2 bg-neutral-100 rounded-lg font-semibold text-neutral-900">
                    {formatWeekDisplay(selectedWeek)}
                  </div>
                  <button
                    onClick={() => navigateWeek('next')}
                    disabled={!canNavigateNext()}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      canNavigateNext()
                        ? 'bg-royalBlue text-white hover:bg-blue-700'
                        : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    Next Week
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
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
                        src={resolveAvatarUrl(performer.avatar_url)} 
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