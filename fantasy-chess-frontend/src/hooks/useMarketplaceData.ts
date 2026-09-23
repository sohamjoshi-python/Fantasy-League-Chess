import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { publicErrorMessage } from '../lib/publicError';
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
      return [];
    }

    // Get player details
    const { data: players, error: playersError } = await supabase
      .from('chess_players')
      .select('*')
      .in('id', userPlayerIds);

    if (playersError) throw playersError;

    return players || [];
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

  const loadOwnedPlayerIds = useCallback(async (targetLeagueId: string): Promise<Set<string>> => {
    const { data: allTeams, error: teamsError } = await supabase
      .from('teams')
      .select('player_ids')
      .eq('league_id', targetLeagueId);

    if (teamsError) throw teamsError;

    const ownedPlayerIds = new Set<string>();
    allTeams?.forEach(team => {
      team.player_ids?.forEach((id: string) => ownedPlayerIds.add(id));
    });
    return ownedPlayerIds;
  }, []);

  const refreshAvailablePlayers = useCallback(async () => {
    if (!leagueId) return;

    try {
      const ownedPlayerIds = await loadOwnedPlayerIds(leagueId);
      setData(prev => ({
        ...prev,
        availablePlayers: prev.allPlayers.filter(player => !ownedPlayerIds.has(player.id)),
      }));
    } catch (error) {
      console.error('Error refreshing available players:', error);
    }
  }, [leagueId, loadOwnedPlayerIds]);

  const loadData = useCallback(async () => {
    if (!leagueId || !userId) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setData(prev => ({
        ...prev,
        loading: prev.allPlayers.length === 0,
        error: null
      }));

      const [allPlayers, userTeam, userCoinBalance, ownedPlayerIds] = await Promise.all([
        loadAllPlayers(),
        loadUserTeam(leagueId, userId),
        loadUserCoinBalance(leagueId, userId),
        loadOwnedPlayerIds(leagueId)
      ]);

      setData({
        allPlayers,
        availablePlayers: allPlayers.filter(player => !ownedPlayerIds.has(player.id)),
        userTeam,
        userCoinBalance,
        loading: false,
        error: null
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled
      }
      
      console.error('Error loading marketplace data');
      setData(prev => ({
        ...prev,
        loading: false,
        error: publicErrorMessage(error, 'Failed to load marketplace data')
      }));
    }
  }, [leagueId, userId, loadAllPlayers, loadUserTeam, loadUserCoinBalance, loadOwnedPlayerIds]);

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

  useEffect(() => {
    if (!leagueId) return;

    const channel = supabase
      .channel(`marketplace-teams-${leagueId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `league_id=eq.${leagueId}` },
        () => {
          refreshAvailablePlayers();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'league_player_ownership', filter: `league_id=eq.${leagueId}` },
        () => {
          refreshAvailablePlayers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leagues', filter: `id=eq.${leagueId}` },
        () => {
          refreshAvailablePlayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, refreshAvailablePlayers]);

  return {
    ...data,
    refresh,
    refreshAvailablePlayers,
    invalidateCache
  };
}
