export const ScoutingPhase = {
  AUTH: 'AUTH',
  AUTONOMOUS: 'AUTONOMOUS',
  TELEOP: 'TELEOP',
  SUMMARY: 'SUMMARY',
  ADMIN: 'ADMIN',
  MANAGEMENT: 'MANAGEMENT'
} as const;
export type ScoutingPhase = typeof ScoutingPhase[keyof typeof ScoutingPhase];

export const Language = {
  EN: 'EN',
  HE: 'HE'
} as const;
export type Language = typeof Language[keyof typeof Language];

export interface User {
  teamScouted: string; // The team we are scouting
  name: string; // The name of the scouter
  matchNumber: string; // The match/game number
  role: 'scouter' | 'admin' | 'guest';
  allianceColor?: 'Red' | 'Blue';
  sessionId?: string;
  sessionStartTime?: number;
}

export interface AutoCycle {
  id: string;
  collected: boolean;
  count: number;
  missCount: number; 
}

export interface AutoData {
  matchNumber: string;
  teamScouted: string;
  isZoneSmall: boolean;
  isZoneBig: boolean;
  leave: boolean;
  cycles: AutoCycle[];
  openGate: boolean;
  intake: boolean;
  ballsSide: number; 
  ballsMissed: number; 
  freeText: string;
}

export interface TeleOpData {
  intake: number;
  isSmallTriangle: boolean;
  isBigTriangle: boolean;
  isGateActive: boolean;
  gateOverflow: number;
  fieldAwareness: boolean;
  lateTranslation: boolean;
  success: boolean;
  fastRebound: boolean;
  isFrozen: boolean;
  confused: boolean;
  stoppedScoring: boolean;
  fullParkingType: boolean;
  liftParkingType: boolean;
  noParkingType: boolean;
  gateFoul: boolean;
  parkingFoul: boolean;
  intakeFoul: boolean;
  humanPlayer: boolean;
  floor: boolean;
  comments: string;
}

export interface SpreadsheetRow {
  sessionId: string;
  timestamp: string;
  sessionStartTime: string;
  sessionEndTime?: string;
  name: string;
  matchNumber: string;
  allianceColor?: string;
  teamScouted: string;
  role?: string;
  isAutoZoneSmall: boolean;
  isAutoZoneBig: boolean;
  isAutoLeave: boolean;
  autoOpenGate: boolean;
  autoIntakeUsed: boolean;
  autoBallHit: number;
  autoBallMiss: number;
  autoNotes: string;
  teleBallHit: number;
  isTeleopZoneSmall: boolean;
  isTeleopZoneBig: boolean;
  teleBallMiss: number;
  teleFieldAwareness: boolean;
  teleLateTranslation: boolean;
  teleOverallSuccess: boolean;
  teleFastRebound: boolean;
  teleIsFrozen: boolean;
  teleConfused: boolean;
  teleStoppedScoring: boolean;
  teleGateFoul: boolean;
  teleParkingFoul: boolean;
  teleIntakeFoul: boolean;
  teleFoulCount: number;
  teleHumanPlayer: boolean;
  teleFloor: boolean;
  teleComments: string;
  aiAnalysis?: string;
  recordType: 'SESSION_START' | 'AUTO_COMPLETE' | 'TELEOP_COMPLETE' | 'MATCH_COMPLETE';
  sheetName?: string;
  headers?: string[];

  // Hebrew Mapped Fields for demo-table
  '.'?: string;
  'teleFullParking'?: boolean;
}

export interface TeamAggregatedData {
  TeamNumber: string;
  GAMES_COUNT: number;
  TOTAL_TELEOP_HIT: number;
  TOTAL_AUTONOMUS_HIT: number;
  TOTAL_TELEOP_MISS: number;
  TOTAL_AUTONOMUS_MISS: number;
  TOTAL_IS_FULL_PARKING: number;
  TOTAL_AUTO_ZONE_SMALL: number;
  TOTAL_AUTO_ZONE_BIG: number;
  TOTAL_TELEOP_ZONE_SMALL: number;
  TOTAL_TELEOP_ZONE_BIG: number;
  TOTAL_AUTO_LEAVE: number;
  TOTAL_FOULS: number;
  TOTAL_GATE_FOULS: number;
  TOTAL_PARKING_FOULS: number;
  TOTAL_INTAKE_FOULS: number;
  GRADE: number;
  RATIO: number;
  RANK: number;

  // New Aggregations
  TOTAL_OPEN_GATE?: number;
  TOTAL_INTAKE_USED?: number;
  TOTAL_SHOOTING_SMALL?: number;
  TOTAL_SHOOTING_BIG?: number;
  TOTAL_COLLECTION_HUMAN?: number;
  TOTAL_COLLECTION_FLOOR?: number;
  TOTAL_DRIVER_AWARENESS?: number;
  TOTAL_DRIVER_SUCCESS?: number;
  TOTAL_DRIVER_REBOUND?: number;
  TOTAL_DRIVER_LATE?: number;
  TOTAL_DRIVER_FROZEN?: number;
  TOTAL_DRIVER_CONFUSED?: number;
  TOTAL_DRIVER_STOPPED?: number;
}

export interface TeamGradeResult {
  grade: number;
  ratio: number;
  gradeDetails?: {
    avgAutoHit: number;
    avgTeleopHit: number;
    avgAutoMiss: number;
    avgTeleopMiss: number;
    avgFouls: number;
    avgParking: number;
    weights: Record<string, number>;
  };
}

export interface ProcessLog {
  id: string;
  timestamp: string;
  rowTimestamp: string;
  teamNumber: string;
  action: 'updated' | 'already_updated' | 'skipped' | 'triggered' | 'cleared';
  details: string;
}
