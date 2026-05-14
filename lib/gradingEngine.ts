import type { TeamAggregatedData, TeamGradeResult } from '../types.ts';

/**
 * Grading Engine Weights
 * These are configurable parameters for the team performance calculation.
 */
export const GRADING_WEIGHTS = {
  POINTS_AUTO_HIT: 7,
  POINTS_TELEOP_HIT: 5,
  POINTS_PARKING: 5,
  POINTS_AUTO_MISS: -1,
  POINTS_TELEOP_MISS: -1,
  POINTS_FAUL: -2,
};

/**
 * Calculates a team's performance grade and hit/miss ratio based on aggregated data.
 * 
 * @param data The aggregated totals for a specific team.
 * @returns An object containing the calculated grade and ratio.
 */
export function calculateTeamGrade(data: TeamAggregatedData): TeamGradeResult {
  const {
    GAMES_COUNT,
    TOTAL_TELEOP_HIT,
    TOTAL_AUTONOMUS_HIT,
    TOTAL_TELEOP_MISS,
    TOTAL_AUTONOMUS_MISS,
    TOTAL_IS_FULL_PARKING,
    TOTAL_FOULS
  } = data;

  // Safety check: if no games played, return zeroed results
  if (!GAMES_COUNT || GAMES_COUNT === 0) {
    return { grade: 0, ratio: 0 };
  }

  // 1. Calculate Averages
  const avgAutoHit = TOTAL_AUTONOMUS_HIT / GAMES_COUNT;
  const avgTeleopHit = TOTAL_TELEOP_HIT / GAMES_COUNT;
  const avgAutoMiss = TOTAL_AUTONOMUS_MISS / GAMES_COUNT;
  const avgTeleopMiss = TOTAL_TELEOP_MISS / GAMES_COUNT;
  const avgFouls = TOTAL_FOULS / GAMES_COUNT;
  const avgParking = TOTAL_IS_FULL_PARKING / GAMES_COUNT;

  // 2. Calculate Grade using weights
  const grade = 
    (avgAutoHit * GRADING_WEIGHTS.POINTS_AUTO_HIT) +
    (avgTeleopHit * GRADING_WEIGHTS.POINTS_TELEOP_HIT) +
    (avgAutoMiss * GRADING_WEIGHTS.POINTS_AUTO_MISS) +
    (avgTeleopMiss * GRADING_WEIGHTS.POINTS_TELEOP_MISS) +
    (avgFouls * GRADING_WEIGHTS.POINTS_FAUL) +
    (avgParking * GRADING_WEIGHTS.POINTS_PARKING);

  // 3. Calculate Tie-Breaker (Ratio)
  const totalHits = TOTAL_TELEOP_HIT + TOTAL_AUTONOMUS_HIT;
  const totalMisses = TOTAL_TELEOP_MISS + TOTAL_AUTONOMUS_MISS;

  let ratio: number;
  if (totalMisses === 0) {
    // Safety Check: If total misses = 0, set the ratio to the total hits
    ratio = totalHits;
  } else {
    ratio = totalHits / totalMisses;
  }

  return {
    grade: Number(grade.toFixed(2)),
    ratio: Number(ratio.toFixed(2))
  };
}
