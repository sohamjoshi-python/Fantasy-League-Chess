// Usage: node src/test_player_points.js <userEmail> <date>
// Example: node src/test_player_points.js user@email.com 2025.06.24

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wdbwzvnkfbyzazodfhsw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYnd6dm5rZmJ5emF6b2RmaHN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTA0ODc5NCwiZXhwIjoyMDY2NjI0Nzk0fQ.xvJsDJzsEX6Xmc8W7hJG57o3FifOuPD6ji-n-QZxtN0";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const [,, userEmailArg, dateArg] = process.argv;
  if (!userEmailArg || !dateArg) {
    console.log('Usage: node src/test_player_points.js <userEmail> <date>');
    process.exit(1);
  }
  const userEmail = userEmailArg;
  const date = dateArg;

  // 1. Get user id from email
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', userEmail)
    .single();
  if (userError || !userData) {
    console.error('User not found:', userError || 'No user');
    process.exit(1);
  }
  const userId = userData.id;

  // 2. Get lineup for user and date
  const { data: lineup, error: lineupError } = await supabase
    .from('lineups')
    .select('player_ids')
    .eq('user_id', userId)
    .eq('week_start_date', date)
    .single();
  if (lineupError || !lineup) {
    console.error('No lineup found for user/date:', lineupError || 'No lineup');
    process.exit(1);
  }
  const playerIds = lineup.player_ids;

  // 3. Get player names for those ids
  const { data: players, error: playersError } = await supabase
    .from('chess_players')
    .select('id, name')
    .in('id', playerIds);
  if (playersError || !players) {
    console.error('Could not fetch player names:', playersError || 'No players');
    process.exit(1);
  }

  // 4. Get all games for that date
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('*')
    .eq('date', date);
  if (gamesError) {
    console.error('Error fetching games:', gamesError);
    process.exit(1);
  }

  let lineupTotal = 0;
  for (const player of players) {
    const playerName = player.name.toLowerCase().trim();
    const playerGames = games.filter(g =>
      (g.white && g.white.toLowerCase().trim() === playerName) ||
      (g.black && g.black.toLowerCase().trim() === playerName)
    );
    const playerPoints = playerGames.reduce((sum, g) => {
      if (g.white && g.white.toLowerCase().trim() === playerName) return sum + Number(g.white_points || 0);
      if (g.black && g.black.toLowerCase().trim() === playerName) return sum + Number(g.black_points || 0);
      return sum;
    }, 0);
    lineupTotal += playerPoints;
    console.log(`Player: ${player.name}`);
    console.log('  Matched games:', playerGames);
    console.log('  Total points:', playerPoints);
  }
  console.log('Lineup total points:', lineupTotal);
}

main(); 