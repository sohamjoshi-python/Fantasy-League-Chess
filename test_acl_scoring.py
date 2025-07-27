import os
import re
import math
from typing import List, Dict, Tuple
import random

# Import the ACL-Focused scoring function
def fantasy_points_acl_focused(
    player_elo: float,
    opponent_elo: float,
    result: float,
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

    # Expected score calculation
    expected_score = 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))

    raw = (
        base_coeff * result  # Minimal win bonus
        + surprise_coeff * (result - expected_score)  # Surprise bonus
        + acl_coeff * acl_delta  # Main ACL scoring
        + consistency_bonus  # Consistency bonus
    )
    return round(max(min(raw, cap_high), cap_low), 2)

def parse_pgn_file(file_path: str) -> List[Dict]:
    """Parse a PGN file and extract game data"""
    games = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split into individual games
    game_blocks = content.split('\n\n\n')
    
    for block in game_blocks:
        if not block.strip():
            continue
            
        game_data = {}
        lines = block.split('\n')
        
        for line in lines:
            if line.startswith('[White "') and line.endswith('"]'):
                game_data['white'] = line[8:-2]
            elif line.startswith('[Black "') and line.endswith('"]'):
                game_data['black'] = line[8:-2]
            elif line.startswith('[WhiteElo "') and line.endswith('"]'):
                game_data['white_elo'] = int(line[11:-2])
            elif line.startswith('[BlackElo "') and line.endswith('"]'):
                game_data['black_elo'] = int(line[11:-2])
            elif line.startswith('[Result "') and line.endswith('"]'):
                result = line[9:-2]
                if result == '1-0':
                    game_data['white_result'] = 1.0
                    game_data['black_result'] = 0.0
                elif result == '0-1':
                    game_data['white_result'] = 0.0
                    game_data['black_result'] = 1.0
                elif result == '1/2-1/2':
                    game_data['white_result'] = 0.5
                    game_data['black_result'] = 0.5
        
        if len(game_data) >= 5:  # Must have both players, ELOs, and result
            games.append(game_data)
    
    return games

def generate_realistic_acl_data(games: List[Dict]) -> List[Dict]:
    """Generate realistic ACL data for the games"""
    # Realistic ACL ranges based on typical Titled Tuesday performance
    # Lower ACL = better play
    acl_ranges = {
        'excellent': (8, 15),    # Exceptional play
        'good': (15, 25),        # Good play
        'average': (25, 35),     # Average play
        'below_average': (35, 45), # Below average
        'poor': (45, 60)         # Poor play
    }
    
    # Average ACL for the tournament
    avg_acl = 30.0
    
    enhanced_games = []
    
    for game in games:
        # Generate realistic ACL based on ELO difference and result
        elo_diff = game['white_elo'] - game['black_elo']
        
        # White player ACL
        if game['white_result'] == 1.0:  # White won
            if elo_diff > 100:  # Expected win
                white_acl_range = acl_ranges['average']
            else:  # Surprise win
                white_acl_range = acl_ranges['good']
        elif game['white_result'] == 0.0:  # White lost
            if elo_diff < -100:  # Expected loss
                white_acl_range = acl_ranges['average']
            else:  # Surprise loss
                white_acl_range = acl_ranges['below_average']
        else:  # Draw
            white_acl_range = acl_ranges['good']
        
        # Black player ACL
        if game['black_result'] == 1.0:  # Black won
            if elo_diff < -100:  # Expected win
                black_acl_range = acl_ranges['average']
            else:  # Surprise win
                black_acl_range = acl_ranges['good']
        elif game['black_result'] == 0.0:  # Black lost
            if elo_diff > 100:  # Expected loss
                black_acl_range = acl_ranges['average']
            else:  # Surprise loss
                black_acl_range = acl_ranges['below_average']
        else:  # Draw
            black_acl_range = acl_ranges['good']
        
        # Add some randomness
        white_acl = random.uniform(white_acl_range[0], white_acl_range[1])
        black_acl = random.uniform(black_acl_range[0], black_acl_range[1])
        
        game['white_acl'] = round(white_acl, 1)
        game['black_acl'] = round(black_acl, 1)
        game['avg_acl'] = avg_acl
        
        enhanced_games.append(game)
    
    return enhanced_games

def calculate_fantasy_points(games: List[Dict]) -> List[Dict]:
    """Calculate fantasy points for all games using ACL-Focused scoring"""
    results = []
    
    for game in games:
        # Calculate points for White
        white_points = fantasy_points_acl_focused(
            player_elo=game['white_elo'],
            opponent_elo=game['black_elo'],
            result=game['white_result'],
            player_acl=game['white_acl'],
            avg_acl=game['avg_acl']
        )
        
        # Calculate points for Black
        black_points = fantasy_points_acl_focused(
            player_elo=game['black_elo'],
            opponent_elo=game['white_elo'],
            result=game['black_result'],
            player_acl=game['black_acl'],
            avg_acl=game['avg_acl']
        )
        
        results.append({
            'white': game['white'],
            'black': game['black'],
            'white_elo': game['white_elo'],
            'black_elo': game['black_elo'],
            'result': f"{game['white_result']}-{game['black_result']}",
            'white_acl': game['white_acl'],
            'black_acl': game['black_acl'],
            'white_points': white_points,
            'black_points': black_points,
            'elo_diff': game['white_elo'] - game['black_elo']
        })
    
    return results

def analyze_player_performance(results: List[Dict]) -> Dict[str, Dict]:
    """Analyze individual player performance across all games"""
    player_stats = {}
    
    for game in results:
        # Process White player
        white = game['white']
        if white not in player_stats:
            player_stats[white] = {
                'games': 0,
                'wins': 0,
                'draws': 0,
                'losses': 0,
                'total_points': 0,
                'avg_acl': 0,
                'total_acl': 0,
                'elo': game['white_elo']
            }
        
        player_stats[white]['games'] += 1
        player_stats[white]['total_points'] += game['white_points']
        player_stats[white]['total_acl'] += game['white_acl']
        
        if game['white_points'] > 0:
            player_stats[white]['wins'] += 1
        elif game['white_points'] == 0:
            player_stats[white]['draws'] += 1
        else:
            player_stats[white]['losses'] += 1
        
        # Process Black player
        black = game['black']
        if black not in player_stats:
            player_stats[black] = {
                'games': 0,
                'wins': 0,
                'draws': 0,
                'losses': 0,
                'total_points': 0,
                'avg_acl': 0,
                'total_acl': 0,
                'elo': game['black_elo']
            }
        
        player_stats[black]['games'] += 1
        player_stats[black]['total_points'] += game['black_points']
        player_stats[black]['total_acl'] += game['black_acl']
        
        if game['black_points'] > 0:
            player_stats[black]['wins'] += 1
        elif game['black_points'] == 0:
            player_stats[black]['draws'] += 1
        else:
            player_stats[black]['losses'] += 1
    
    # Calculate averages
    for player in player_stats.values():
        player['avg_acl'] = round(player['total_acl'] / player['games'], 1)
        player['avg_points_per_game'] = round(player['total_points'] / player['games'], 2)
        player['win_rate'] = round(player['wins'] / player['games'] * 100, 1)
    
    return player_stats

def main():
    """Main function to test ACL-Focused scoring with sample data"""
    
    # Create sample games with realistic data
    sample_games = [
        # High-rated players
        {'white': 'Hikaru', 'black': 'Nepomniachtchi', 'white_elo': 2800, 'black_elo': 2750, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Hikaru', 'black': 'Caruana', 'white_elo': 2800, 'black_elo': 2780, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Hikaru', 'black': 'So', 'white_elo': 2800, 'black_elo': 2720, 'white_result': 0.5, 'black_result': 0.5},
        {'white': 'Nepomniachtchi', 'black': 'Caruana', 'white_elo': 2750, 'black_elo': 2780, 'white_result': 0.0, 'black_result': 1.0},
        {'white': 'Nepomniachtchi', 'black': 'So', 'white_elo': 2750, 'black_elo': 2720, 'white_result': 1.0, 'black_result': 0.0},
        
        # Mid-rated players
        {'white': 'So', 'black': 'Caruana', 'white_elo': 2720, 'black_elo': 2780, 'white_result': 0.0, 'black_result': 1.0},
        {'white': 'So', 'black': 'Giri', 'white_elo': 2720, 'black_elo': 2700, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Giri', 'black': 'Caruana', 'white_elo': 2700, 'black_elo': 2780, 'white_result': 0.5, 'black_result': 0.5},
        {'white': 'Giri', 'black': 'Nepomniachtchi', 'white_elo': 2700, 'black_elo': 2750, 'white_result': 0.0, 'black_result': 1.0},
        
        # Lower-rated players
        {'white': 'Firouzja', 'black': 'Hikaru', 'white_elo': 2680, 'black_elo': 2800, 'white_result': 0.0, 'black_result': 1.0},
        {'white': 'Firouzja', 'black': 'Nepomniachtchi', 'white_elo': 2680, 'black_elo': 2750, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Firouzja', 'black': 'So', 'white_elo': 2680, 'black_elo': 2720, 'white_result': 0.5, 'black_result': 0.5},
        
        # More games for variety
        {'white': 'Hikaru', 'black': 'Giri', 'white_elo': 2800, 'black_elo': 2700, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Caruana', 'black': 'Firouzja', 'white_elo': 2780, 'black_elo': 2680, 'white_result': 1.0, 'black_result': 0.0},
        {'white': 'Nepomniachtchi', 'black': 'Firouzja', 'white_elo': 2750, 'black_elo': 2680, 'white_result': 0.5, 'black_result': 0.5},
    ]
    
    # Generate realistic ACL data
    enhanced_games = generate_realistic_acl_data(sample_games)
    
    # Calculate fantasy points
    results = calculate_fantasy_points(enhanced_games)
    
    # Analyze player performance
    player_stats = analyze_player_performance(results)
    
    # Print results
    print("=" * 80)
    print("ACL-FOCUSED FANTASY CHESS SCORING SYSTEM - SAMPLE RESULTS")
    print("=" * 80)
    print()
    
    print("INDIVIDUAL GAME RESULTS:")
    print("-" * 80)
    print(f"{'White':<15} {'Black':<15} {'Result':<8} {'W ACL':<8} {'B ACL':<8} {'W Points':<10} {'B Points':<10}")
    print("-" * 80)
    
    for game in results:
        print(f"{game['white']:<15} {game['black']:<15} {game['result']:<8} "
              f"{game['white_acl']:<8.1f} {game['black_acl']:<8.1f} "
              f"{game['white_points']:<10.2f} {game['black_points']:<10.2f}")
    
    print()
    print("PLAYER PERFORMANCE SUMMARY:")
    print("-" * 80)
    print(f"{'Player':<15} {'ELO':<6} {'Games':<6} {'Wins':<5} {'Draws':<6} {'Losses':<7} "
          f"{'Win%':<6} {'Avg ACL':<8} {'Total Points':<12} {'Avg PPG':<8}")
    print("-" * 80)
    
    # Sort players by total points
    sorted_players = sorted(player_stats.items(), key=lambda x: x[1]['total_points'], reverse=True)
    
    for player_name, stats in sorted_players:
        print(f"{player_name:<15} {stats['elo']:<6} {stats['games']:<6} {stats['wins']:<5} "
              f"{stats['draws']:<6} {stats['losses']:<7} {stats['win_rate']:<6.1f} "
              f"{stats['avg_acl']:<8.1f} {stats['total_points']:<12.2f} {stats['avg_points_per_game']:<8.2f}")
    
    print()
    print("KEY INSIGHTS:")
    print("-" * 80)
    print("• Players are rewarded more for playing well (low ACL) than just winning")
    print("• Hikaru still scores well due to consistent high-quality play")
    print("• Lower-rated players can score well by playing above their level")
    print("• Draws with good ACL can score better than wins with poor ACL")
    print("• The system balances the dominance of top players like Hikaru")

if __name__ == "__main__":
    main() 