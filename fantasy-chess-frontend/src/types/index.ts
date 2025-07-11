export interface User {
  id: string
  email: string
  username: string
  coins: number
  created_at: string
}

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
  accuracy?: number
  games?: number
  created_at: string
  updated_at?: string
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
  white_accuracy: number | null
  black_accuracy: number | null
  round: string
  white_points: number
  black_points: number
  created_at: string
}

export interface PlayerAccuracy {
  id: string
  player: string
  accuracy: number | null
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