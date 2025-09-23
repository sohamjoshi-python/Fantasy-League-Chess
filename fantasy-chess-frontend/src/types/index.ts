export type User = {
  id: string;
  username: string;
  coins: number;
  selected_avatar_url?: string;
  email: string;
};

export interface Bot {
  id: string
  league_id: string
  name: string
  team_id?: string
  created_at: string
}

export interface ChessPlayer {
  id: string
  name: string
  elo: number
  fide_id?: string
  country?: string
  average_centipawn_loss?: number
  games?: number
  created_at: string
  updated_at?: string
  league_owners?: { [leagueId: string]: string } // Map of leagueId to userId
}

export interface League {
  id: string
  name: string
  description?: string
  is_public: boolean
  buy_in: number
  start_date: string
  end_date: string
  join_code: string
  creator_id: string
  member_ids: string[]
  draft_order: string[]
  current_draft_turn: number
  draft_completed: boolean
  created_at: string
  draft_started?: boolean
  draft_start_time?: string
  payout_processed?: boolean
  bot_id?: string
  max_members?: number
  // New marketplace fields
  marketplace_started?: boolean
  marketplace_order?: string[]
  current_marketplace_turn?: number
  marketplace_completed?: boolean
  marketplace_start_time?: string
  max_players_per_team?: number
}

export interface MarketplaceTurn {
  id: string
  league_id: string
  user_id?: string
  bot_id?: string
  turn_number: number
  action_type: 'buy' | 'skip'
  player_id?: string
  price?: number
  created_at: string
}

export interface CurrentMarketplaceTurn {
  current_user_id: string
  turn_number: number
  total_turns: number
  is_completed: boolean
  user_team_size: number
}

export interface LeagueMember {
  id: string
  league_id: string
  user_id: string
  display_name: string
  email: string
  joined_at: string
}

export interface Team {
  id: string
  user_id?: string
  bot_id?: string
  league_id: string
  player_ids: string[]
  created_at: string
}

export interface Lineup {
  id: string
  user_id?: string
  bot_id?: string
  league_id: string
  week_start_date: string
  player_ids: string[]
  total_points: number
  created_at: string
}

export interface Game {
  id: string
  early_late: string
  date: string
  white: string
  black: string
  result: string
  white_average_centipawn_loss: number | null
  black_average_centipawn_loss: number | null
  round: string
  white_points: number
  black_points: number
  created_at: string
}

export interface PlayerACL {
  id: string
  player: string
  average_centipawn_loss: number | null
  games: number
  created_at: string
  updated_at: string
}

export interface WeeklyScore {
  user_id: string
  league_id: string
  week_start_date: string
  total_points: number
  rank: number
}

export interface LeagueStanding {
  user_id: string
  user_email: string
  total_points: number
  rank: number
  team_size: number
}

export interface Notification {
  id: string
  user_id: string
  league_id?: string
  title: string
  message: string
  type: 'league_start' | 'weekly_results' | 'league_end' | 'draft_start' | 'payout_processed' | 'player_removed' | 'league_joined'
  is_read: boolean
  created_at: string
  data?: any
}

// Trading System Types
export interface Trade {
  id: string
  league_id: string
  seller_id: string
  buyer_id?: string
  player_id: string
  price: number
  status: 'pending' | 'accepted' | 'cancelled' | 'expired'
  created_at: string
  expires_at: string
  accepted_at?: string
  cancelled_at?: string
}

export interface TradeNotification {
  id: string
  trade_id: string
  user_id: string
  seen: boolean
  created_at: string
}

export interface TradeWithDetails {
  trade_id: string
  player_name: string
  player_elo: number
  price: number
  status: string
  created_at: string
  expires_at: string
  is_seller: boolean
}

export interface TradeNotificationWithDetails {
  notification_id: string
  trade_id: string
  seller_name: string
  player_name: string
  player_elo: number
  price: number
  created_at: string
} 