import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ChessPlayer } from '../types';

interface MarketplaceData {
  allPlayers: ChessPlayer[];
  availablePlayers: ChessPlayer[];
  userTeam: ChessPlayer[];
  userCoinBalance: number;
  loading: boolean;
  error: string | null;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class DataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  // Clear specific patterns
  clearPattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new DataCache();

export function useMarketplaceData(leagueId: string, userId: string | undefined) {
  const [data, setData] = useState<MarketplaceData>({
    allPlayers: [],
    availablePlayers: [],
    userTeam: [],
    userCoinBalance: 0,
    loading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadAllPlayers = useCallback(async (): Promise<ChessPlayer[]> => {
    const cacheKey = 'all-players';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let allPlayers: ChessPlayer[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: players, error: playersError } = await supabase
        .from('chess_players')
        .select('*')
        .order('elo', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (playersError) throw playersError;

      if (!players || players.length === 0) break;
      
      allPlayers = allPlayers.concat(players);
      if (players.length < pageSize) break;
      page++;

      // Safety check
      if (page > 10) {
        console.warn('Reached maximum page limit, stopping pagination');
        break;
      }
    }

    // Cache for 10 minutes since this data changes rarely
    cache.set(cacheKey, allPlayers, 10 * 60 * 1000);
    return allPlayers;
  }, []);

  const loadUserTeam = useCallback(async (leagueId: string, userId: string): Promise<ChessPlayer[]> => {
    const cacheKey = `user-team-${userId}-${leagueId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { data: userTeam, error: teamError } = await supabase
      .from('teams')
      .select('player_ids')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (teamError && teamError.code !== 'PGRST116') {
      throw teamError;
    }

    const userPlayerIds = userTeam?.player_ids || [];
    
    if (userPlayerIds.length === 0) {
      cache.set(cacheKey, [], 2 * 60 * 1000); // Cache empty team for 2 minutes
      return [];
    }

    // Get player details
    const { data: players, error: playersError } = await supabase
      .from('chess_players')
      .select('*')
      .in('id', userPlayerIds);

    if (playersError) throw playersError;

    const teamPlayers = players || [];
    cache.set(cacheKey, teamPlayers, 2 * 60 * 1000); // Cache for 2 minutes
    return teamPlayers;
  }, []);

  const loadUserCoinBalance = useCallback(async (leagueId: string, userId: string): Promise<number> => {
    const cacheKey = `coin-balance-${userId}-${leagueId}`;
    const cached = cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const { data: balance, error: balanceError } = await supabase
      .from('league_coin_balances')
      .select('coin_balance')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }

    const coinBalance = balance?.coin_balance || 0;
    cache.set(cacheKey, coinBalance, 1 * 60 * 1000); // Cache for 1 minute
    return coinBalance;
  }, []);

  const loadData = useCallback(async () => {
    if (!leagueId || !userId) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Load all data in parallel
      const [allPlayers, userTeam, userCoinBalance] = await Promise.all([
        loadAllPlayers(),
        loadUserTeam(leagueId, userId),
        loadUserCoinBalance(leagueId, userId)
      ]);

      // Get all teams to determine available players
      const { data: allTeams, error: teamsError } = await supabase
        .from('teams')
        .select('player_ids')
        .eq('league_id', leagueId);

      if (teamsError) throw teamsError;

      // Create set of owned player IDs
      const ownedPlayerIds = new Set<string>();
      allTeams?.forEach(team => {
        team.player_ids?.forEach((id: string) => ownedPlayerIds.add(id));
      });

      // Filter available players
      const availablePlayers = allPlayers.filter(player => !ownedPlayerIds.has(player.id));

      setData({
        allPlayers,
        availablePlayers,
        userTeam,
        userCoinBalance,
        loading: false,
        error: null
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error('Error loading marketplace data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load marketplace data'
      }));
    }
  }, [leagueId, userId, loadAllPlayers, loadUserTeam, loadUserCoinBalance]);

  // Refresh function to invalidate cache and reload
  const refresh = useCallback(() => {
    cache.clearPattern(leagueId);
    cache.clearPattern(userId || '');
    loadData();
  }, [leagueId, userId, loadData]);

  // Invalidate specific cache entries
  const invalidateCache = useCallback((pattern: string) => {
    cache.clearPattern(pattern);
  }, []);

  useEffect(() => {
    loadData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  return {
    ...data,
    refresh,
    invalidateCache
  };
}
