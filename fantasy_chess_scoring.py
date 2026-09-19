import math
from typing import Literal

Result = Literal[1.0, 0.5, 0.0]

def expected_score(player_elo: float, opponent_elo: float) -> float:
    """Calculate expected score based on ELO difference"""
    return 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))

# 1. Overperformance-focused scoring (individual ACL baseline)
# Compares each player's game ACL against their own historical average ACL.
# Surprise vs Elo expected score is the main term so upsets outscore routine Super GM wins.
def acl_focused_scoring_individual_baseline(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_game_acl: float,  # ACL for this specific game
    player_avg_acl: float,   # Player's historical average ACL from games.accuracy
    base_win_bonus: float = 0.5,
    surprise_coeff: float = 7.0,
    acl_coeff: float = 0.8,
    consistency_bonus_threshold: float = 5.0, # ACL points better than their avg to get bonus
    consistency_bonus_amount: float = 3.0,
    cap_low: float = -12.0,
    cap_high: float = 12.0,
) -> float:
    """
    Overperformance-focused scoring with an individual ACL baseline:
    - Surprise (result vs Elo expected score) is the main scoring term
    - ACL is compared only to that player's own historical average, not the field
    - ACL weight is kept modest so a slightly clean Super GM game cannot cap out
    - Symmetric caps prevent consistent elite players from farming an uneven floor/ceiling
    """
    expected = expected_score(player_elo, opponent_elo)
    surprise = result - expected
    
    # Handle cases where ACL data is not available
    if math.isnan(player_game_acl) or math.isnan(player_avg_acl) or (player_game_acl == 0 and player_avg_acl == 0):
        acl_delta = 0
        consistency_bonus = 0
    else:
        # Compare this game's ACL against player's own average ACL
        acl_delta = player_avg_acl - player_game_acl  # Positive if player_acl is lower (better) than their avg
        consistency_bonus = consistency_bonus_amount if acl_delta >= consistency_bonus_threshold else 0
    
    raw_points = (
        base_win_bonus * result
        + surprise_coeff * surprise
        + acl_coeff * acl_delta
        + consistency_bonus
    )
    return round(max(min(raw_points, cap_high), cap_low), 2)

# 2. Balanced ACL Scoring (Updated for Individual Player Baseline)
# More balanced approach with moderate ACL emphasis
def balanced_acl_scoring_individual_baseline(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_game_acl: float,
    player_avg_acl: float,
    base_coeff: float = 1.0,
    surprise_coeff: float = 1.5,
    acl_coeff: float = 4.0,
    cap_low: float = -5.0,
    cap_high: float = 12.0,
) -> float:
    """
    Balanced ACL Scoring with Individual Player Baseline:
    - Moderate emphasis on ACL vs personal average
    - Balanced win bonus and surprise bonus
    """
    expected = expected_score(player_elo, opponent_elo)
    surprise = result - expected
    
    if math.isnan(player_game_acl) or math.isnan(player_avg_acl) or (player_game_acl == 0 and player_avg_acl == 0):
        acl_delta = 0
    else:
        acl_delta = player_avg_acl - player_game_acl
    
    raw_points = (
        base_coeff * result
        + surprise_coeff * surprise
        + acl_coeff * acl_delta
    )
    return round(max(min(raw_points, cap_high), cap_low), 2)

# 3. Progressive ACL Scoring (Updated for Individual Player Baseline)
# Progressive bonus based on how much better than their average
def progressive_acl_scoring_individual_baseline(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_game_acl: float,
    player_avg_acl: float,
    base_coeff: float = 0.8,
    surprise_coeff: float = 1.5,
    acl_coeff: float = 6.0,
    progressive_multiplier: float = 1.5,
    cap_low: float = -6.0,
    cap_high: float = 18.0,
) -> float:
    """
    Progressive ACL Scoring with Individual Player Baseline:
    - Progressive bonus for exceeding personal average
    - Higher rewards for significantly better than usual play
    """
    expected = expected_score(player_elo, opponent_elo)
    surprise = result - expected
    
    if math.isnan(player_game_acl) or math.isnan(player_avg_acl) or (player_game_acl == 0 and player_avg_acl == 0):
        acl_delta = 0
        progressive_bonus = 0
    else:
        acl_delta = player_avg_acl - player_game_acl
        # Progressive bonus: more points for significantly better than average
        if acl_delta > 10:
            progressive_bonus = acl_delta * progressive_multiplier
        elif acl_delta > 5:
            progressive_bonus = acl_delta * 1.2
        else:
            progressive_bonus = acl_delta
    
    raw_points = (
        base_coeff * result
        + surprise_coeff * surprise
        + acl_coeff * acl_delta
        + progressive_bonus
    )
    return round(max(min(raw_points, cap_high), cap_low), 2)

# 4. Consistency-Focused Scoring (Updated for Individual Player Baseline)
# Rewards consistent performance above personal baseline
def consistency_focused_scoring_individual_baseline(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_game_acl: float,
    player_avg_acl: float,
    base_coeff: float = 0.6,
    surprise_coeff: float = 1.0,
    acl_coeff: float = 5.0,
    consistency_bonus: float = 4.0,
    cap_low: float = -4.0,
    cap_high: float = 16.0,
) -> float:
    """
    Consistency-Focused Scoring with Individual Player Baseline:
    - Rewards consistent performance above personal average
    - Lower base coefficients, higher consistency bonus
    """
    expected = expected_score(player_elo, opponent_elo)
    surprise = result - expected
    
    if math.isnan(player_game_acl) or math.isnan(player_avg_acl) or (player_game_acl == 0 and player_avg_acl == 0):
        acl_delta = 0
        consistency_reward = 0
    else:
        acl_delta = player_avg_acl - player_game_acl
        # Consistency reward: bonus for playing above personal average
        consistency_reward = consistency_bonus if acl_delta > 0 else 0
    
    raw_points = (
        base_coeff * result
        + surprise_coeff * surprise
        + acl_coeff * acl_delta
        + consistency_reward
    )
    return round(max(min(raw_points, cap_high), cap_low), 2)

# 5. Hybrid Scoring (Updated for Individual Player Baseline)
# Combines win bonus with ACL performance vs personal average
def hybrid_scoring_individual_baseline(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_game_acl: float,
    player_avg_acl: float,
    win_bonus: float = 1.0,
    surprise_coeff: float = 1.2,
    acl_coeff: float = 3.0,
    performance_multiplier: float = 2.0,
    cap_low: float = -3.0,
    cap_high: float = 14.0,
) -> float:
    """
    Hybrid Scoring with Individual Player Baseline:
    - Balanced win bonus and ACL performance
    - Performance multiplier for exceeding personal average
    """
    expected = expected_score(player_elo, opponent_elo)
    surprise = result - expected
    
    if math.isnan(player_game_acl) or math.isnan(player_avg_acl) or (player_game_acl == 0 and player_avg_acl == 0):
        acl_delta = 0
        performance_bonus = 0
    else:
        acl_delta = player_avg_acl - player_game_acl
        # Performance bonus for exceeding personal average
        performance_bonus = acl_delta * performance_multiplier if acl_delta > 0 else 0
    
    raw_points = (
        win_bonus * result
        + surprise_coeff * surprise
        + acl_coeff * acl_delta
        + performance_bonus
    )
    return round(max(min(raw_points, cap_high), cap_low), 2)

# Example usage and comparison
if __name__ == "__main__":
    # Example: Hikaru (2800 ELO) vs a 2700 player
    # Hikaru's average ACL is 25, but in this game he played with ACL 15
    hikaru_game = acl_focused_scoring_individual_baseline(
        player_elo=2800,
        opponent_elo=2700,
        result=1.0,  # Hikaru won
        player_game_acl=15.0,  # Excellent game ACL
        player_avg_acl=25.0,   # Hikaru's historical average ACL
    )
    
    # Example: Lower-rated player (2600 ELO) vs 2700 player
    # Player's average ACL is 35, but in this game they played with ACL 20
    lower_rated_game = acl_focused_scoring_individual_baseline(
        player_elo=2600,
        opponent_elo=2700,
        result=0.5,  # Draw
        player_game_acl=20.0,  # Excellent game ACL (better than their average)
        player_avg_acl=35.0,   # Player's historical average ACL
    )
    
    print(f"Hikaru (2800 vs 2700, won, ACL 15 vs avg 25): {hikaru_game} points")
    print(f"Lower-rated (2600 vs 2700, draw, ACL 20 vs avg 35): {lower_rated_game} points")
    
    print("\nKey Benefits of Individual Baseline Approach:")
    print("1. Rewards players for performing better than their usual level")
    print("2. Lower-rated players can score well by exceeding their Elo expected score")
    print("3. High-rated players need upsets or a clearly cleaner-than-usual game to score high")
    print("4. More fair comparison across different skill levels")
    print("5. Encourages improvement and consistent high performance")
