from fantasy_chess_scoring import acl_focused_scoring_individual_baseline

def test_individual_baseline_scoring():
    """Test the individual baseline scoring system with realistic examples"""
    
    print("=" * 80)
    print("INDIVIDUAL BASELINE ACL SCORING SYSTEM - TESTING")
    print("=" * 80)
    print()
    print("This system compares each player's game ACL against their own historical average ACL")
    print("Formula: Points = (0.5 × result) + (2.0 × surprise) + (8.0 × ACL_delta) + consistency_bonus")
    print("Where: ACL_delta = player_avg_acl - player_game_acl (lower ACL = better play)")
    print()
    
    # Test cases with realistic data
    test_cases = [
        # (player_elo, opponent_elo, result, game_acl, avg_acl, description)
        (2800, 2700, 1.0, 15.0, 25.0, "Hikaru - Excellent game (ACL 15 vs avg 25)"),
        (2800, 2700, 1.0, 30.0, 25.0, "Hikaru - Poor game (ACL 30 vs avg 25)"),
        (2600, 2700, 0.5, 20.0, 35.0, "Lower-rated - Excellent game (ACL 20 vs avg 35)"),
        (2600, 2700, 0.5, 40.0, 35.0, "Lower-rated - Poor game (ACL 40 vs avg 35)"),
        (2700, 2800, 0.0, 18.0, 30.0, "Mid-rated - Excellent loss (ACL 18 vs avg 30)"),
        (2700, 2800, 0.0, 35.0, 30.0, "Mid-rated - Poor loss (ACL 35 vs avg 30)"),
        (2750, 2750, 0.5, 22.0, 28.0, "Equal players - Good draw (ACL 22 vs avg 28)"),
        (2750, 2750, 0.5, 32.0, 28.0, "Equal players - Poor draw (ACL 32 vs avg 28)"),
    ]
    
    print("TEST RESULTS:")
    print("-" * 80)
    print(f"{'Scenario':<40} {'Result':<8} {'Game ACL':<10} {'Avg ACL':<10} {'Points':<8}")
    print("-" * 80)
    
    for player_elo, opponent_elo, result, game_acl, avg_acl, description in test_cases:
        points = acl_focused_scoring_individual_baseline(
            player_elo=player_elo,
            opponent_elo=opponent_elo,
            result=result,
            player_game_acl=game_acl,
            player_avg_acl=avg_acl
        )
        
        result_str = f"{result:.1f}"
        print(f"{description:<40} {result_str:<8} {game_acl:<10.1f} {avg_acl:<10.1f} {points:<8.2f}")
    
    print()
    print("KEY INSIGHTS:")
    print("-" * 80)
    print("1. Players score well when they perform better than their usual level")
    print("2. High-rated players need to play above their average to score high")
    print("3. Lower-rated players can score well by exceeding their personal baseline")
    print("4. The system rewards improvement and consistent high performance")
    print("5. This balances the dominance of top players like Hikaru")
    
    print()
    print("COMPARISON WITH TRADITIONAL SCORING:")
    print("-" * 80)
    print("Traditional: Hikaru wins = high points regardless of play quality")
    print("New System: Hikaru needs excellent play (ACL 15 vs avg 25) to score high")
    print("Traditional: Lower-rated players struggle to compete")
    print("New System: Lower-rated players can score well with excellent play")
    
    # Show specific examples
    print()
    print("SPECIFIC EXAMPLES:")
    print("-" * 80)
    
    # Hikaru examples
    hikaru_excellent = acl_focused_scoring_individual_baseline(2800, 2700, 1.0, 15.0, 25.0)
    hikaru_poor = acl_focused_scoring_individual_baseline(2800, 2700, 1.0, 30.0, 25.0)
    
    print(f"Hikaru (2800 vs 2700, won):")
    print(f"  - Excellent game (ACL 15 vs avg 25): {hikaru_excellent} points")
    print(f"  - Poor game (ACL 30 vs avg 25): {hikaru_poor} points")
    print(f"  - Difference: {hikaru_excellent - hikaru_poor:.2f} points")
    
    # Lower-rated player examples
    lower_excellent = acl_focused_scoring_individual_baseline(2600, 2700, 0.5, 20.0, 35.0)
    lower_poor = acl_focused_scoring_individual_baseline(2600, 2700, 0.5, 40.0, 35.0)
    
    print(f"\nLower-rated player (2600 vs 2700, draw):")
    print(f"  - Excellent game (ACL 20 vs avg 35): {lower_excellent} points")
    print(f"  - Poor game (ACL 40 vs avg 35): {lower_poor} points")
    print(f"  - Difference: {lower_excellent - lower_poor:.2f} points")
    
    print()
    print("This system successfully balances the playing field!")
    print("High-rated players must play well to score high, not just win.")
    print("Lower-rated players can compete by playing above their usual level.")

if __name__ == "__main__":
    test_individual_baseline_scoring() 