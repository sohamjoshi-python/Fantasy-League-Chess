from typing import Literal
import math

Result = Literal[0, 0.5, 1]

def expected_score(player_elo: float, opponent_elo: float) -> float:
    return 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))

# ========================================
# OPTION 1: ACL-FOCUSED SCORING
# Prioritizes playing quality with minimal win bonus
# ========================================

def fantasy_points_acl_focused(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 0.5,  # Reduced win bonus
    surprise_coeff: float = 2.0,  # Reduced surprise bonus
    acl_coeff: float = 8.0,  # Much higher ACL coefficient
    acl_consistency_bonus: float = 3.0,  # Bonus for consistent play
    cap_low: float = -8.0,
    cap_high: float = 15.0,
) -> float:
    """
    ACL-Focused Scoring:
    - Minimal points for just winning (0.5 base)
    - Heavy emphasis on playing quality (ACL)
    - Bonus for consistent play vs expected
    - Surprise bonus for unexpected results
    """
    # Handle missing ACL data
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_delta = 0
        consistency_bonus = 0
    else:
        acl_delta = avg_acl - player_acl  # improvement = lower ACL
        # Bonus for playing better than expected for their level
        expected_acl = avg_acl * (1 + (opponent_elo - player_elo) / 1000)  # Adjust for rating difference
        consistency_bonus = max(0, expected_acl - player_acl) * acl_consistency_bonus

    raw = (
        base_coeff * result  # Minimal win bonus
        + surprise_coeff * (result - expected_score(player_elo, opponent_elo))  # Surprise bonus
        + acl_coeff * acl_delta  # Main ACL scoring
        + consistency_bonus  # Consistency bonus
    )
    return round(max(min(raw, cap_high), cap_low), 2)

# ========================================
# OPTION 2: PERFORMANCE RATIO SCORING
# Uses performance ratio relative to expected performance
# ========================================

def fantasy_points_performance_ratio(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 1.0,
    performance_coeff: float = 6.0,
    acl_weight: float = 0.7,  # Weight of ACL vs result
    cap_low: float = -10.0,
    cap_high: float = 18.0,
) -> float:
    """
    Performance Ratio Scoring:
    - Combines result and ACL into a single performance metric
    - Higher weight on ACL (70%) vs result (30%)
    - Rewards playing well regardless of outcome
    """
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_performance = 0.5  # Neutral performance if no ACL data
    else:
        # Normalize ACL performance (0-1 scale, lower ACL = better)
        acl_performance = max(0, min(1, (avg_acl - player_acl) / avg_acl + 0.5))
    
    # Expected result based on rating
    expected_result = expected_score(player_elo, opponent_elo)
    
    # Combined performance score (70% ACL, 30% result)
    performance_score = (acl_weight * acl_performance + (1 - acl_weight) * result)
    
    # Performance ratio vs expected
    expected_performance = (acl_weight * 0.5 + (1 - acl_weight) * expected_result)
    performance_ratio = performance_score / expected_performance if expected_performance > 0 else 1.0
    
    raw = (
        base_coeff * result  # Small base win bonus
        + performance_coeff * (performance_ratio - 1.0)  # Performance vs expected
    )
    return round(max(min(raw, cap_high), cap_low), 2)

# ========================================
# OPTION 3: TIERED ACL SCORING
# Different scoring tiers based on ACL performance
# ========================================

def fantasy_points_tiered_acl(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 0.3,  # Very small win bonus
    acl_tier_coeff: float = 10.0,  # High ACL tier bonus
    surprise_coeff: float = 1.5,
    cap_low: float = -12.0,
    cap_high: float = 20.0,
) -> float:
    """
    Tiered ACL Scoring:
    - Minimal points for just winning
    - Tiered bonuses based on ACL performance
    - Rewards exceptional play significantly
    """
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_tier_bonus = 0
    else:
        # Calculate ACL tier bonus
        acl_ratio = player_acl / avg_acl if avg_acl > 0 else 1.0
        
        if acl_ratio <= 0.5:  # Exceptional play (50% better than average)
            acl_tier_bonus = 8.0
        elif acl_ratio <= 0.7:  # Great play (30% better than average)
            acl_tier_bonus = 5.0
        elif acl_ratio <= 0.9:  # Good play (10% better than average)
            acl_tier_bonus = 2.0
        elif acl_ratio <= 1.1:  # Average play
            acl_tier_bonus = 0.0
        elif acl_ratio <= 1.3:  # Below average play
            acl_tier_bonus = -1.0
        else:  # Poor play
            acl_tier_bonus = -3.0

    raw = (
        base_coeff * result  # Minimal win bonus
        + acl_tier_coeff * acl_tier_bonus  # ACL tier bonus
        + surprise_coeff * (result - expected_score(player_elo, opponent_elo))  # Surprise bonus
    )
    return round(max(min(raw, cap_high), cap_low), 2)

# ========================================
# OPTION 4: OPPONENT-ADJUSTED ACL SCORING
# Adjusts ACL scoring based on opponent strength
# ========================================

def fantasy_points_opponent_adjusted(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 0.4,
    acl_coeff: float = 6.0,
    opponent_adjustment: float = 2.0,
    surprise_coeff: float = 1.0,
    cap_low: float = -10.0,
    cap_high: float = 16.0,
) -> float:
    """
    Opponent-Adjusted ACL Scoring:
    - Adjusts ACL scoring based on opponent strength
    - Playing well against stronger opponents gets more points
    - Playing poorly against weaker opponents gets penalized
    """
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_score = 0
        opponent_bonus = 0
    else:
        # Base ACL score
        acl_delta = avg_acl - player_acl
        
        # Opponent adjustment factor
        elo_diff = opponent_elo - player_elo
        opponent_factor = 1 + (elo_diff / 1000) * opponent_adjustment
        
        # Adjusted ACL score
        acl_score = acl_delta * opponent_factor
        
        # Bonus for playing well against stronger opponents
        if elo_diff > 100 and acl_delta > 0:
            opponent_bonus = min(3.0, acl_delta * (elo_diff / 500))
        elif elo_diff < -100 and acl_delta < 0:
            opponent_bonus = max(-2.0, acl_delta * (abs(elo_diff) / 500))
        else:
            opponent_bonus = 0

    raw = (
        base_coeff * result  # Small win bonus
        + acl_coeff * acl_score  # ACL score
        + opponent_bonus  # Opponent adjustment bonus
        + surprise_coeff * (result - expected_score(player_elo, opponent_elo))  # Surprise bonus
    )
    return round(max(min(raw, cap_high), cap_low), 2)

# ========================================
# OPTION 5: HYBRID QUALITY-FOCUSED SCORING
# Balanced approach with heavy emphasis on quality
# ========================================

def fantasy_points_hybrid_quality(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 0.6,  # Moderate win bonus
    acl_coeff: float = 7.0,  # High ACL coefficient
    quality_bonus: float = 4.0,  # Bonus for high-quality play
    consistency_coeff: float = 2.0,  # Consistency bonus
    cap_low: float = -8.0,
    cap_high: float = 18.0,
) -> float:
    """
    Hybrid Quality-Focused Scoring:
    - Balanced approach with heavy emphasis on playing quality
    - Rewards both winning and playing well
    - Bonus for consistent high-quality play
    """
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_score = 0
        quality_bonus_score = 0
        consistency_score = 0
    else:
        # Base ACL score
        acl_delta = avg_acl - player_acl
        
        # Quality bonus for exceptional play
        if acl_delta > avg_acl * 0.3:  # 30% better than average
            quality_bonus_score = quality_bonus
        elif acl_delta > avg_acl * 0.1:  # 10% better than average
            quality_bonus_score = quality_bonus * 0.5
        else:
            quality_bonus_score = 0
        
        # Consistency bonus (playing well consistently)
        expected_acl = avg_acl * (1 + (opponent_elo - player_elo) / 2000)
        consistency_score = max(0, expected_acl - player_acl) * consistency_coeff

    raw = (
        base_coeff * result  # Moderate win bonus
        + acl_coeff * acl_score  # ACL score
        + quality_bonus_score  # Quality bonus
        + consistency_score  # Consistency bonus
    )
    return round(max(min(raw, cap_high), cap_low), 2)

# ========================================
# RECOMMENDED OPTION: ACL-FOCUSED SCORING
# This is the recommended approach for your use case
# ========================================

def fantasy_points_recommended(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
) -> float:
    """
    RECOMMENDED: ACL-Focused Scoring System
    
    This system prioritizes playing quality over just winning:
    - Minimal points for just winning (0.5 base)
    - Heavy emphasis on ACL performance (8.0 coefficient)
    - Bonus for playing better than expected for their level
    - Surprise bonus for unexpected results
    
    Perfect for balancing players like Hikaru who win consistently
    but should be rewarded more for playing exceptionally well.
    """
    return fantasy_points_acl_focused(
        player_elo=player_elo,
        opponent_elo=opponent_elo,
        result=result,
        player_acl=player_acl,
        avg_acl=avg_acl
    )

# ========================================
# TESTING AND COMPARISON FUNCTIONS
# ========================================

def test_scoring_systems():
    """Test all scoring systems with sample data"""
    
    # Sample game data
    test_cases = [
        # (player_elo, opponent_elo, result, player_acl, avg_acl, description)
        (2800, 2700, 1, 15, 25, "Hikaru wins with good ACL"),
        (2800, 2700, 1, 25, 25, "Hikaru wins with average ACL"),
        (2800, 2700, 0, 15, 25, "Hikaru loses with good ACL"),
        (2700, 2800, 1, 20, 25, "Underdog wins with decent ACL"),
        (2700, 2800, 0, 30, 25, "Underdog loses with poor ACL"),
        (2750, 2750, 0.5, 18, 25, "Equal players draw with good ACL"),
    ]
    
    print("=== FANTASY CHESS SCORING SYSTEM COMPARISON ===\n")
    
    for player_elo, opponent_elo, result, player_acl, avg_acl, description in test_cases:
        print(f"Scenario: {description}")
        print(f"  Player ELO: {player_elo}, Opponent ELO: {opponent_elo}")
        print(f"  Result: {result}, Player ACL: {player_acl}, Avg ACL: {avg_acl}")
        
        # Test all systems
        systems = [
            ("Original", lambda: fantasy_points(player_elo, opponent_elo, result, player_acl, avg_acl)),
            ("ACL-Focused", lambda: fantasy_points_acl_focused(player_elo, opponent_elo, result, player_acl, avg_acl)),
            ("Performance Ratio", lambda: fantasy_points_performance_ratio(player_elo, opponent_elo, result, player_acl, avg_acl)),
            ("Tiered ACL", lambda: fantasy_points_tiered_acl(player_elo, opponent_elo, result, player_acl, avg_acl)),
            ("Opponent-Adjusted", lambda: fantasy_points_opponent_adjusted(player_elo, opponent_elo, result, player_acl, avg_acl)),
            ("Hybrid Quality", lambda: fantasy_points_hybrid_quality(player_elo, opponent_elo, result, player_acl, avg_acl)),
        ]
        
        for name, func in systems:
            try:
                points = func()
                print(f"  {name}: {points:>6.2f} points")
            except Exception as e:
                print(f"  {name}: ERROR - {e}")
        
        print()

if __name__ == "__main__":
    test_scoring_systems() 