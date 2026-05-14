-- Migration Script for Scoutmaster Supabase
-- Run this in your Supabase SQL Editor

-- 1. Main Raw Data Table
DROP TABLE IF EXISTS scoutsmaster_ongoing CASCADE;
CREATE TABLE scoutsmaster_ongoing (
    id BIGSERIAL PRIMARY KEY,
    "sessionId" TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    "sessionStartTime" TIMESTAMPTZ,
    "sessionEndTime" TIMESTAMPTZ,
    name TEXT,
    "matchNumber" TEXT,
    "teamScouted" TEXT,
    role TEXT,
    "isAutoZoneSmall" BOOLEAN,
    "isAutoZoneBig" BOOLEAN,
    "isAutoLeave" BOOLEAN,
    "autoOpenGate" BOOLEAN,
    "autoIntakeUsed" BOOLEAN,
    "autoBallHit" INTEGER,
    "autoBallMiss" INTEGER,
    "autoNotes" TEXT,
    "teleBallHit" INTEGER,
    "teleBallMiss" INTEGER,
    "teleFieldAwareness" BOOLEAN,
    "teleLateTranslation" BOOLEAN,
    "teleOverallSuccess" BOOLEAN,
    "teleFastRebound" BOOLEAN,
    "teleIsFrozen" BOOLEAN,
    "teleConfused" BOOLEAN,
    "teleStoppedScoring" BOOLEAN,
    "teleGateFoul" BOOLEAN,
    "teleParkingFoul" BOOLEAN,
    "teleIntakeFoul" BOOLEAN,
    "teleFoulCount" INTEGER,
    "teleHumanPlayer" BOOLEAN,
    "teleFloor" BOOLEAN,
    "teleComments" TEXT,
    "aiAnalysis" TEXT,
    "recordType" TEXT,
    "isTeleopZoneSmall" BOOLEAN,
    "isTeleopZoneBig" BOOLEAN,
    "teleFullParking" BOOLEAN,
    "allianceColor" TEXT,
    UNIQUE("sessionId")
);

-- 2. Logs Table
DROP TABLE IF EXISTS job_execution_logs CASCADE;
CREATE TABLE job_execution_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT now(),
    "rowTimestamp" TEXT,
    "teamNumber" TEXT,
    action TEXT,
    details TEXT
);

-- 3. System Settings Table
DROP TABLE IF EXISTS system_settings CASCADE;
CREATE TABLE system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    "isAutoCalcActive" BOOLEAN DEFAULT true,
    "calcIntervalSeconds" INTEGER DEFAULT 80,
    "targetSheetId" TEXT,
    "lastConsolidationTime" TIMESTAMPTZ,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 4. Teams Grades Table (Aggregated)
DROP TABLE IF EXISTS teams_grades CASCADE;
CREATE TABLE teams_grades (
    "TeamNumber" TEXT PRIMARY KEY,
    "GAMES_COUNT" INTEGER,
    "TOTAL_TELEOP_HIT" INTEGER,
    "TOTAL_AUTONOMUS_HIT" INTEGER,
    "TOTAL_TELEOP_MISS" INTEGER,
    "TOTAL_AUTONOMUS_MISS" INTEGER,
    "TOTAL_IS_FULL_PARKING" INTEGER,
    "TOTAL_AUTO_ZONE_SMALL" INTEGER,
    "TOTAL_AUTO_ZONE_BIG" INTEGER,
    "TOTAL_TELEOP_ZONE_SMALL" INTEGER,
    "TOTAL_TELEOP_ZONE_BIG" INTEGER,
    "TOTAL_AUTO_LEAVE" INTEGER,
    "TOTAL_FOULS" INTEGER,
    "TOTAL_GATE_FOULS" INTEGER,
    "TOTAL_PARKING_FOULS" INTEGER,
    "TOTAL_INTAKE_FOULS" INTEGER,
    "GRADE" NUMERIC,
    "RATIO" NUMERIC,
    "RANK" INTEGER
);

-- 5. Auth Config Table
DROP TABLE IF EXISTS auth_config CASCADE;
CREATE TABLE auth_config (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    role TEXT,
    password TEXT
);

-- 6. Disable RLS for all tables to allow migration and easy access (You can enable them later with specific policies)
ALTER TABLE scoutsmaster_ongoing DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_execution_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams_grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_config DISABLE ROW LEVEL SECURITY;
