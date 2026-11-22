import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { resolveAvatarUrl } from '../lib/avatars';
import { Trophy, Target, Clock, Calendar, Medal, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocalDateString, getWeekStartMonday, addDaysToYmd } from '../lib/calendarDate';
import { LeaderboardPageSkeleton } from '../components/ui/LoadingSpinner';
import { forgetView, forgetViewsWithPrefix, readView, writeView } from '../lib/viewCache';

interface LeaderboardCache {
  wins: LeaderboardEntry[]
  points: LeaderboardEntry[]
}

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

const TOP_LEADERBOARD_COUNT = 10;
const PRIVATE_LEAGUE_LABEL = 'Private league';

function LeagueName({ name }: { name: string }) {
  if (name === PRIVATE_LEAGUE_LABEL) {
    return <p className="text-sm italic text-violet-600">{PRIVATE_LEAGUE_LABEL}</p>;
  }
  return <p className="text-sm text-neutral-600">{name}</p>;
}

function rowsForViewer<T extends { user_id: string }>(rows: T[], userId?: string | null) {
  const ranked = rows.map((row, index) => ({ row, rank: index + 1 }));
  const top = ranked.slice(0, TOP_LEADERBOARD_COUNT);
  if (!userId) return top;
  const ownBelowTop = ranked.filter((item) => item.row.user_id === userId && item.rank > TOP_LEADERBOARD_COUNT);
  return [...top, ...ownBelowTop];
}

const SHARED_LEADERBOARD_CACHE = 'leaderboard:v3';

function recentWinnersCacheKey(userId?: string | null) {
  return userId ? `${userId}:recent-winners:v2` : null;
}

function weeklyPerformersCacheKey(userId: string | null | undefined, weekDate: string) {
  return userId ? `${userId}:weekly:${weekDate}` : null;
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const cachedBoard = readView<LeaderboardCache>(SHARED_LEADERBOARD_CACHE);
  const recentKey = recentWinnersCacheKey(user?.id);
  const cachedRecent = recentKey ? readView<RecentWinner[]>(recentKey) : null;
  const [activeTab, setActiveTab] = useState<LeaderboardType>('wins');
  const [winsData, setWinsData] = useState<LeaderboardEntry[]>(cachedBoard?.wins || []);
  const [pointsData, setPointsData] = useState<LeaderboardEntry[]>(cachedBoard?.points || []);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>(user?.id ? cachedRecent || [] : []);
  const [weeklyPerformers, setWeeklyPerformers] = useState<WeeklyPerformer[]>([]);
  const [loading, setLoading] = useState(!cachedBoard);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    forgetView('leaderboard');
    forgetViewsWithPrefix('weekly:');
  }, []);

  useEffect(() => {
    fetchAllLeaderboards();
  }, [user?.id]);

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyPerformers(selectedWeek);
    }
  }, [selectedWeek, user?.id]);

  const fetchAllLeaderboards = async () => {
    if (!readView(SHARED_LEADERBOARD_CACHE)) setLoading(true);
    try {
      const [winsResult, pointsResult, recentResult] = await Promise.all([
        supabase.rpc('get_league_wins_leaderboard'),
        supabase.rpc('get_total_points_leaderboard'),
        supabase.rpc('get_recent_winners'),
      ]);
      const wins = winsResult.data || [];
      const points = pointsResult.data || [];
      const recent = recentResult.data || [];
      setWinsData(wins);
      setPointsData(points);
      setRecentWinners(recent);
      writeView<LeaderboardCache>(SHARED_LEADERBOARD_CACHE, {
        wins: wins.slice(0, TOP_LEADERBOARD_COUNT),
        points: points.slice(0, TOP_LEADERBOARD_COUNT),
      });
      const recentKey = recentWinnersCacheKey(user?.id);
      if (recentKey) writeView(recentKey, recent.slice(0, TOP_LEADERBOARD_COUNT));

      setSelectedWeek(getWeekStartMonday());

    } catch (error) {
      console.error('Error fetching leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyPerformers = async (weekDate: string) => {
    const weeklyKey = weeklyPerformersCacheKey(user?.id, weekDate);
    const cached = weeklyKey ? readView<WeeklyPerformer[]>(weeklyKey) : null;
    if (cached) setWeeklyPerformers(cached);
    try {
      const { data } = await supabase.rpc('get_weekly_top_performers', { week_date: weekDate });
      const rows = data || [];
      setWeeklyPerformers(rows);
      if (weeklyKey) writeView(weeklyKey, rows.slice(0, TOP_LEADERBOARD_COUNT));
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

  const visibleWins = rowsForViewer(winsData, user?.id);
  const visiblePoints = rowsForViewer(pointsData, user?.id);
  const visibleRecent = rowsForViewer(recentWinners, user?.id);
  const visibleWeekly = rowsForViewer(weeklyPerformers, user?.id);

  if (loading) {
    return <LeaderboardPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-royalBlue to-purple-900">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 flex flex-wrap items-center justify-center gap-2">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-gold" />
            Fantasy Chess Leaderboards
          </h1>
          <p className="text-white/80 text-lg">Track the best players across all leagues</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/15 rounded-lg p-1 mb-8">
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
                  {visibleWins.map((item, index) => (
                    <div key={item.row.user_id}>
                      {item.rank > TOP_LEADERBOARD_COUNT && visibleWins[index - 1]?.rank <= TOP_LEADERBOARD_COUNT && (
                        <p className="mb-2 text-sm font-medium text-neutral-500">Your rank</p>
                      )}
                    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${item.row.user_id === user?.id ? 'bg-royalBlue/10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(item.rank - 1)}
                      </div>
                      <img 
                        src={resolveAvatarUrl(item.row.avatar_url)} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.row.username}{item.row.user_id === user?.id ? ' (You)' : ''}</h3>
                        <p className="text-sm text-neutral-600">
                          {item.row.total_leagues} leagues played
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{item.row.wins} wins</div>
                        <div className="text-sm text-neutral-600">
                          {formatGems(item.row.total_prize_money || 0)} in prizes
                        </div>
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
                  {visiblePoints.map((item, index) => (
                    <div key={item.row.user_id}>
                      {item.rank > TOP_LEADERBOARD_COUNT && visiblePoints[index - 1]?.rank <= TOP_LEADERBOARD_COUNT && (
                        <p className="mb-2 text-sm font-medium text-neutral-500">Your rank</p>
                      )}
                    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${item.row.user_id === user?.id ? 'bg-royalBlue/10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(item.rank - 1)}
                      </div>
                      <img 
                        src={resolveAvatarUrl(item.row.avatar_url)} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.row.username}{item.row.user_id === user?.id ? ' (You)' : ''}</h3>
                        <p className="text-sm text-neutral-600">
                          {item.row.leagues_played} leagues • {item.row.average_points_per_league?.toFixed(1)} avg/league
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{formatPoints(item.row.total_points)} pts</div>
                        <div className="mt-1 flex flex-wrap justify-end gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">
                            +{formatPoints(item.row.points_won)} won
                          </span>
                          <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                            -{formatPoints(item.row.points_lost)} lost
                          </span>
                        </div>
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
                  {visibleRecent.map((item, index) => (
                    <div key={`${item.row.user_id}-${item.row.league_name}-${item.rank}`}>
                      {item.rank > TOP_LEADERBOARD_COUNT && visibleRecent[index - 1]?.rank <= TOP_LEADERBOARD_COUNT && (
                        <p className="mb-2 text-sm font-medium text-neutral-500">Your rank</p>
                      )}
                    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${item.row.user_id === user?.id ? 'bg-royalBlue/10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                      <div className="flex items-center justify-center w-8">
                        <span className="text-lg font-bold text-neutral-600">{item.rank}</span>
                      </div>
                      <img 
                        src={resolveAvatarUrl(item.row.avatar_url)} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.row.username}{item.row.user_id === user?.id ? ' (You)' : ''}</h3>
                        <LeagueName name={item.row.league_name} />
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gold">{formatGems(item.row.prize_amount)}</div>
                        <div className="text-sm text-neutral-600">
                          {formatDate(item.row.won_date)}
                        </div>
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
                  {visibleWeekly.map((item, index) => (
                    <div key={`${item.row.user_id}-${item.row.league_name}-${item.rank}`}>
                      {item.rank > TOP_LEADERBOARD_COUNT && visibleWeekly[index - 1]?.rank <= TOP_LEADERBOARD_COUNT && (
                        <p className="mb-2 text-sm font-medium text-neutral-500">Your rank</p>
                      )}
                    <div className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${item.row.user_id === user?.id ? 'bg-royalBlue/10 border border-royalBlue' : 'bg-neutral-50 hover:bg-neutral-100'}`}>
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(item.rank - 1)}
                      </div>
                      <img 
                        src={resolveAvatarUrl(item.row.avatar_url)} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full border-2 border-gold" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{item.row.username}{item.row.user_id === user?.id ? ' (You)' : ''}</h3>
                        <LeagueName name={item.row.league_name} />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gold">{item.row.week_points.toFixed(1)} pts</div>
                        <div className="text-sm text-neutral-600">this week</div>
                      </div>
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