// Coin System Types

export interface CoinTransaction {
  id: string;
  user_id?: string;
  bot_id?: string;
  transaction_type: 'weekly_award' | 'player_purchase' | 'player_sale' | 'trade_buy' | 'trade_sell' | 'bonus';
  amount: number;
  description?: string;
  created_at: string;
}

export interface TradeOffer {
  id: string;
  offerer_id?: string;
  offerer_bot_id?: string;
  is_offerer_bot: boolean;
  offeree_id?: string;
  offeree_bot_id?: string;
  is_offeree_bot: boolean;
  offered_player_username?: string;
  offered_coins: number;
  requested_player_username?: string;
  requested_coins: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  responded_at?: string;
}

export interface UserWithCoins {
  id: string;
  email: string;
  coin_balance: number;
}

export interface BotWithCoins {
  id: string;
  name: string;
  coin_balance: number;
}

// Returns the tier name for a given chess.com ELO
export function getPlayerTier(elo: number): string {
  if (elo >= 3200) return 'Legendary';
  if (elo >= 3100) return 'Elite';
  if (elo >= 3000) return 'Super Strong';
  if (elo >= 2900) return 'Strong';
  if (elo >= 2700) return 'Good';
  if (elo >= 2400) return 'Average';
  return 'Developing';
}

// Pricing function for chess.com ELO
export function calculatePlayerPrice(elo: number): number {
  if (elo >= 3200) return 50;
  if (elo >= 3100) return 40;
  if (elo >= 3000) return 30;
  if (elo >= 2900) return 20;
  if (elo >= 2700) return 15;
  if (elo >= 2400) return 10;
  return 5;
}

// Documentation:
// | Chess.com ELO Range | Tier         | Price (Coins) |
// |---------------------|--------------|---------------|
// | 3200+               | Legendary    | 50            |
// | 3100–3199           | Elite        | 40            |
// | 3000–3099           | Super Strong | 30            |
// | 2900–2999           | Strong       | 20            |
// | 2700–2899           | Good         | 15            |
// | 2400–2699           | Average      | 10            |
// | <2400               | Developing   | 5             | 