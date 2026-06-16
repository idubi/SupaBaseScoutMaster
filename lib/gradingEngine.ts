import type { TeamAggregatedData, TeamGradeResult } from '../types.ts';

/**
 * Grading Engine Weights
 * These are configurable parameters for the team performance calculation.
 */
export const GRADING_WEIGHTS: Record<string, number> = {
  POINTS_AUTO_HIT: 7,
  POINTS_TELEOP_HIT: 5,
  POINTS_PARKING: 5,
  POINTS_AUTO_MISS: -1,
  POINTS_TELEOP_MISS: -1,
  POINTS_FAUL: -2,

  // NEW SC scouting fields added per user request
  POINTS_OPEN_GATE: 2,         // Weight for completing 'Open Gate' (autoOpenGate is true)
  POINTS_INTAKE_USED: 2,       // Weight for completing 'Intake Used' (autoIntakeUsed is true)
  POINTS_SHOOTING_SMALL: 2,    // Weight for shooting to small zone (isTeleopZoneSmall is true)
  POINTS_SHOOTING_BIG: 2,      // Weight for shooting to big zone (isTeleopZoneBig is true)
  POINTS_COLLECTION_HUMAN: 2,  // Weight for human player collection (teleHumanPlayer is true)
  POINTS_COLLECTION_FLOOR: 2,  // Weight for floor collection capability (teleFloor is true)
  
  // Driver Skills weights
  POINTS_DRIVER_AWARENESS: 3,  // Weight for good field awareness (teleFieldAwareness is true)
  POINTS_DRIVER_SUCCESS: 3,    // Weight for overall success (teleOverallSuccess is true)
  POINTS_DRIVER_REBOUND: 2,    // Weight for fast rebound (teleFastRebound is true)
  
  // Negative driver skill elements (acting like active fouls)
  POINTS_DRIVER_LATE: -1,      // Penalty for late translation (teleLateTranslation is true)
  POINTS_DRIVER_FROZEN: -3,    // Penalty for robot frozen (teleIsFrozen is true)
  POINTS_DRIVER_CONFUSED: -2,  // Penalty for driver confused (teleConfused is true)
  POINTS_DRIVER_STOPPED: -3    // Penalty for stopped scoring (teleStoppedScoring is true)
};

/**
 * Updates the global default grading weights.
 */
export function updateGradingWeights(newWeights: any) {
  if (!newWeights) return;
  Object.keys(GRADING_WEIGHTS).forEach(key => {
    if (newWeights[key] !== undefined) {
      GRADING_WEIGHTS[key] = Number(newWeights[key]);
    }
  });
}

/**
 * Calculates a team's performance grade and hit/miss ratio based on aggregated data.
 * 
 * @param data The aggregated totals for a specific team.
 * @returns An object containing the calculated grade and ratio.
 */
export function calculateTeamGrade(data: TeamAggregatedData, weights = GRADING_WEIGHTS): TeamGradeResult {
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

  // New averages
  const avgOpenGate = (data.TOTAL_OPEN_GATE || 0) / GAMES_COUNT;
  const avgIntakeUsed = (data.TOTAL_INTAKE_USED || 0) / GAMES_COUNT;
  const avgShootingSmall = (data.TOTAL_SHOOTING_SMALL || 0) / GAMES_COUNT;
  const avgShootingBig = (data.TOTAL_SHOOTING_BIG || 0) / GAMES_COUNT;
  const avgCollectionHuman = (data.TOTAL_COLLECTION_HUMAN || 0) / GAMES_COUNT;
  const avgCollectionFloor = (data.TOTAL_COLLECTION_FLOOR || 0) / GAMES_COUNT;
  const avgDriverAwareness = (data.TOTAL_DRIVER_AWARENESS || 0) / GAMES_COUNT;
  const avgDriverSuccess = (data.TOTAL_DRIVER_SUCCESS || 0) / GAMES_COUNT;
  const avgDriverRebound = (data.TOTAL_DRIVER_REBOUND || 0) / GAMES_COUNT;
  const avgDriverLate = (data.TOTAL_DRIVER_LATE || 0) / GAMES_COUNT;
  const avgDriverFrozen = (data.TOTAL_DRIVER_FROZEN || 0) / GAMES_COUNT;
  const avgDriverConfused = (data.TOTAL_DRIVER_CONFUSED || 0) / GAMES_COUNT;
  const avgDriverStopped = (data.TOTAL_DRIVER_STOPPED || 0) / GAMES_COUNT;

  const getWeight = (key: string) => weights[key] !== undefined ? weights[key] : (GRADING_WEIGHTS as any)[key];

  // 2. Calculate Grade using weights (incorporating the new parameters)
  const grade = 
    (avgAutoHit * getWeight('POINTS_AUTO_HIT')) +
    (avgTeleopHit * getWeight('POINTS_TELEOP_HIT')) +
    (avgAutoMiss * getWeight('POINTS_AUTO_MISS')) +
    (avgTeleopMiss * getWeight('POINTS_TELEOP_MISS')) +
    (avgFouls * getWeight('POINTS_FAUL')) +
    (avgParking * getWeight('POINTS_PARKING')) +
    
    (avgOpenGate * getWeight('POINTS_OPEN_GATE')) +
    (avgIntakeUsed * getWeight('POINTS_INTAKE_USED')) +
    (avgShootingSmall * getWeight('POINTS_SHOOTING_SMALL')) +
    (avgShootingBig * getWeight('POINTS_SHOOTING_BIG')) +
    (avgCollectionHuman * getWeight('POINTS_COLLECTION_HUMAN')) +
    (avgCollectionFloor * getWeight('POINTS_COLLECTION_FLOOR')) +
    (avgDriverAwareness * getWeight('POINTS_DRIVER_AWARENESS')) +
    (avgDriverSuccess * getWeight('POINTS_DRIVER_SUCCESS')) +
    (avgDriverRebound * getWeight('POINTS_DRIVER_REBOUND')) +
    (avgDriverLate * getWeight('POINTS_DRIVER_LATE')) +
    (avgDriverFrozen * getWeight('POINTS_DRIVER_FROZEN')) +
    (avgDriverConfused * getWeight('POINTS_DRIVER_CONFUSED')) +
    (avgDriverStopped * getWeight('POINTS_DRIVER_STOPPED'));

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
    ratio: Number(ratio.toFixed(2)),
    gradeDetails: {
      avgAutoHit,
      avgTeleopHit,
      avgAutoMiss,
      avgTeleopMiss,
      avgFouls,
      avgParking,
      weights
    }
  };
}

