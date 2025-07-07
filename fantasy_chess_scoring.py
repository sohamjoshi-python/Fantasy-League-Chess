from typing import Literal
import math

Result = Literal[0, 0.5, 1]

def expected_score(player_elo: float, opponent_elo: float) -> float:
    return 1 / (1 + 10 ** ((opponent_elo - player_elo) / 400))

def fantasy_points(
    player_elo: float,
    opponent_elo: float,
    result: Result,
    player_acl: float,
    avg_acl: float,
    base_coeff: float = 2.0,
    surprise_coeff: float = 5.0,
    accuracy_coeff: float = 0.30,
    cap_low: float = -6.0,
    cap_high: float = 12.0,
) -> float:
    """
    Fantasy scoring using ACL (average centipawn loss):
      - Lower ACL is better
      - Reward for lower-than-usual ACL (consistency)
      - Surprise bonus if result beats expected
    """
    # Handle cases where accuracy data is not available (player_acl = 0 and avg_acl = 0)
    if math.isnan(player_acl) or math.isnan(avg_acl) or (player_acl == 0 and avg_acl == 0):
        acl_delta = 0
    else:
        acl_delta = avg_acl - player_acl  # improvement = lower ACL

    raw = (
        base_coeff * result
        + surprise_coeff * (result - expected_score(player_elo, opponent_elo))
        + accuracy_coeff * acl_delta
    )
    return round(max(min(raw, cap_high), cap_low), 2)
