import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import pawnRoyaleLogo from '../assets/pawn-royale-logo.png';

interface LeaderboardEntry {
  user_id: string;
  wins: number;
  display_name: string;
  avatar_url?: string;
}

const Leaderboard: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      // Fetch leaderboard from backend (replace with RPC or SQL as needed)
      const { data } = await supabase.rpc('get_league_wins_leaderboard');
      setEntries(data || []);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return <div className="text-center py-8">Loading leaderboard...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">🏆 Most League Wins Leaderboard</h1>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {entries.length === 0 ? (
          <div className="text-center text-neutral-500">No leaderboard data yet.</div>
        ) : (
          <ol className="space-y-4">
            {entries.map((entry, i) => (
              <li key={entry.user_id} className="flex items-center gap-4">
                <span className="text-xl font-bold w-8 text-right">{i + 1}</span>
                <img src={entry.avatar_url || pawnRoyaleLogo} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-gold" />
                <span className="font-semibold text-neutral-900">{entry.display_name}</span>
                <span className="ml-auto text-royalBlue font-bold">{entry.wins} wins</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default Leaderboard; 