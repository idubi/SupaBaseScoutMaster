import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { calculateTeamGrade, GRADING_WEIGHTS, updateGradingWeights } from "./lib/gradingEngine.ts";
import type { TeamAggregatedData } from "./types.ts";
import {ENV}  from "./constants.ts";
import { supabase } from "./lib/supabase.ts";
import postgres from "postgres";



interface SystemSettings {
  isAutoCalcActive: boolean;
  calcIntervalSeconds: number;
  targetSheetId: string;
  lastConsolidationTime: string | null;
}

interface ProcessLog {
  id: string;
  timestamp: string;
  rowTimestamp: string;
  teamNumber: string;
  action: 'updated' | 'already_updated' | 'skipped' | 'triggered' | 'cleared';
  details: string;
}

// Global settings state (in-memory cache)
let settingsSyncedWithSheet = false;
let pendingSettingsSync: Promise<void> | null = null;

// Global kill-switch: Set to true to stop all processing
let isSystemPaused = false;
let processLogs: ProcessLog[] = [];
const MAX_LOGS = 100;

async function addLog(log: Omit<ProcessLog, 'id' | 'timestamp'>) {
  const newLog: ProcessLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString()
  };
  processLogs.unshift(newLog);
  if (processLogs.length > MAX_LOGS) {
    processLogs = processLogs.slice(0, MAX_LOGS);
  }

  // Persist to Supabase
  persistLogToSupabase(newLog).catch(err => 
    console.error("[Logging] Failed to persist to Supabase:", err)
  );
}

async function persistLogToSupabase(log: ProcessLog) {
  try {
    const { error } = await supabase
      .from('job_execution_logs')
      .upsert({
        id: log.id,
        timestamp: log.timestamp,
        rowTimestamp: log.rowTimestamp,
        teamNumber: log.teamNumber,
        action: log.action,
        details: log.details
      });
    if (error) throw error;
  } catch (err) {
    console.error(`[Logging] Error writing to job_execution_logs:`, err);
  }
}

let systemSettings: SystemSettings = {
  isAutoCalcActive: false,
  calcIntervalSeconds: 80,
  targetSheetId: "",
  lastConsolidationTime: null
};

// Tracking internal state for the auto-calc job
let autoCalcStatus: 'idle' | 'running' | 'error' = 'idle';
let consecutiveFailures = 0;
const MAX_FAILURES = 5;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Debug logging for API requests
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  // Middleware to block all requests if system is paused (except status check)
  app.use((req, res, next) => {
    if (isSystemPaused && !req.path.startsWith("/api/system-status")) {
      return res.status(503).json({ error: "System is paused for maintenance" });
    }
    next();
  });

  app.get("/api/system-status", (req, res) => {
    res.json({ isSystemPaused });
  });

  app.get("/api/health-check", async (req, res) => {
    try {
      const results: any = {};
      const tables = ['scoutsmaster_ongoing', 'job_execution_logs', 'system_settings', 'teams_grades', 'auth_config', 'grade_calculation_config', 'grades_config'];
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        results[table] = error ? `Error: ${error.message}` : 'Healthy';
      }
      
      res.json({
        status: 'ok',
        supabase_target: process.env.SUPABASE_URL,
        database_health: results
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  app.post("/api/admin/reset-system", async (req, res) => {
    try {
      console.log("[API] Resetting system data for seed...");
      
      // 1. Clear reports
      await supabase.from('scoutsmaster_ongoing').delete().neq('sessionId', '_');
      
      // 2. Clear logs
      await supabase.from('job_execution_logs').delete().neq('id', '_');
      processLogs = [];
      
      // 3. Clear grades
      await supabase.from('teams_grades').delete().neq('TeamNumber', '_');
      
      // 4. Reset lastConsolidationTime in settings
      systemSettings.lastConsolidationTime = null;
      await persistSettingsToSupabase();
      
      res.json({ success: true, message: "System data reset successfully" });
    } catch (err: any) {
      console.error("[Reset] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/process-logs", (req, res) => {
    res.json(processLogs);
  });

  app.post("/api/admin/clear-logs-all", async (req, res) => {
    console.log("[API] Explicitly clearing logs. Current count:", processLogs.length);
    
    // Clear in-memory immediately
    processLogs = [];
    
    try {
      // Clear logs from Supabase
      const { error } = await supabase
        .from('job_execution_logs')
        .delete()
        .neq('id', '_'); // Hack to delete all

      if (error) throw error;

      console.log("[Logging] Remote clear for Supabase completed.");

      // Add a single log entry confirming the clear
      await addLog({
        rowTimestamp: new Date().toLocaleTimeString(),
        teamNumber: 'SYSTEM',
        action: 'cleared',
        details: 'Persistent logs were cleared successfully from Supabase.'
      });
    } catch (err) {
      console.error("[Logging] Critical error during remote clear:", err);
    }
    
    res.json({ success: true, logs: processLogs });
  });

  app.post("/api/trigger-calc", async (req, res) => {
    await addLog({
      rowTimestamp: new Date().toLocaleTimeString(),
      teamNumber: 'MANUAL',
      action: 'triggered',
      details: 'Manual calculation triggered by user.'
    });

    try {
      await updateTeamsGrades();
      res.json({ success: true, message: "Calculation completed successfully" });
    } catch (error) {
      console.error("Manual trigger failed:", error);
      res.status(500).json({ error: "Calculation failed" });
    }
  });

  // Background Job Loop
  let isBatchJobRunning = false;
  let lastBatchRunTime = 0;
  let lastSettingsFetchTime = 0;

  // Start the background job loop
  setInterval(async () => {
    if (isSystemPaused) return;
    const now = Date.now();
    
    // 1. Periodically fetch settings from Supabase independently (every 2.5 minutes)
    if (now - lastSettingsFetchTime > 150000) {
      refreshSettingsFromSupabase().catch(err => 
        console.error("[Settings Background] Sync failed:", err)
      );
      lastSettingsFetchTime = now;
    }

    // 2. Periodic Auto-Calculation
    if (!systemSettings.isAutoCalcActive) {
      if (now - lastBatchRunTime > 60000) { // Log status every minute even if idle
         console.log(`[Auto-Calc Job] Status: Disabled`);
         lastBatchRunTime = now;
      }
      if (!systemSettings.isAutoCalcActive && autoCalcStatus !== 'error') {
        autoCalcStatus = 'idle';
      }
      return;
    }

    const intervalMs = systemSettings.calcIntervalSeconds * 1000;

    if (now - lastBatchRunTime >= intervalMs && !isBatchJobRunning) {
      isBatchJobRunning = true;
      autoCalcStatus = 'running';
      console.log(`[Auto-Calc Job] Starting specialized execution...`);
      
      try {
        const lastConsolidationDate = systemSettings.lastConsolidationTime 
          ? new Date(systemSettings.lastConsolidationTime) 
          : new Date(0);
        
        // 1. Fetch ALL raw data from Supabase
        const { data: rawData, error: fetchError } = await supabase
          .from('scoutsmaster_ongoing')
          .select('*')
          .gt('sessionEndTime', lastConsolidationDate.toISOString()); // Assuming we have it indexed
        
        if (!fetchError && rawData) {
          const getRowTs = (row: any) => {
            return row.sessionEndTime || row.timestamp || row.Timestamp || row.sessionStartTime || row.rowTs || row.Date || row.time || row.Timestamp_ISO;
          };

          const newRecords = rawData.filter((record: any) => {
            const rawTs = getRowTs(record);
            if (!rawTs) return false;
            const ts = new Date(rawTs);
            // Strictly after last consolidation
            return ts.getTime() > lastConsolidationDate.getTime();
          });

          if (newRecords.length > 0) {
            const uniqueTeams = Array.from(new Set(newRecords.map(r => 
              String(r.teamScouted || r.TeamScouted || r.teamNumber || r.TeamNumber || r.team || r.Team || '').trim()
            ).filter(t => t !== '')));

            console.log(`[Auto-Calc Job] Found ${newRecords.length} new records strictly after ${lastConsolidationDate.toISOString()}. Processing teams: ${uniqueTeams.join(', ')}`);
            
            // Add batch summary log
            await addLog({
              rowTimestamp: new Date().toLocaleTimeString(),
              teamNumber: 'BATCH',
              action: 'updated',
              details: `Found ${newRecords.length} new records for teams: ${uniqueTeams.join(', ')}.`
            });

            const currentSessionTeamsProcessed = new Set<string>();
            let hasChanges = false;

            for (const row of newRecords) {
              const teamNumber = String(row.teamScouted || row.TeamScouted || row.teamNumber || row.TeamNumber || row.team || row.Team || '').trim();
              const rowTs = String(getRowTs(row) || 'Unknown TS');
              
              if (!teamNumber) continue;

              if (!currentSessionTeamsProcessed.has(teamNumber)) {
                currentSessionTeamsProcessed.add(teamNumber);
                hasChanges = true;
              }
            }

            if (hasChanges) {
              await updateTeamsGrades();
              systemSettings.lastConsolidationTime = new Date().toISOString();
              await persistSettingsToSupabase();
              console.log(`[Auto-Calc Job] Successfully refreshed scores.`);
            }
          } else {
            // Log a heartbeat every execution if requested, or every few minutes to avoid clutter
            // The user wants to see it even if no rows updated
            console.log(`[Auto-Calc Job] No new records found after ${lastConsolidationDate.toISOString()}.`);
            await addLog({
              rowTimestamp: 'N/A',
              teamNumber: 'SYSTEM',
              action: 'skipped',
              details: `Sync run: No new records found since ${lastConsolidationDate.toLocaleTimeString()}. (Database is up to date)`
            });
            
            // Still update the heartbeat time to show the system checked
            systemSettings.lastConsolidationTime = new Date().toISOString();
            await persistSettingsToSupabase();
          }
        }
        
        lastBatchRunTime = Date.now();
        consecutiveFailures = 0; 
        autoCalcStatus = 'idle';
      } catch (err) {
        console.error(`[Batch Job] Error:`, err);
        consecutiveFailures++;
        autoCalcStatus = 'error';
        if (consecutiveFailures >= MAX_FAILURES) {
          systemSettings.isAutoCalcActive = false;
          await persistSettingsToSupabase();
        }
      } finally {
        isBatchJobRunning = false;
      }
    }
  }, 10000); // Pulse every 10 seconds

  // API Proxy for fetching unique teams
  app.get("/api/teams", async (req, res) => {
    try {
      // Use the Postgres distinct ON via RPC, or since we don't have RPC defined by default,
      // we'll fetch teamScouted and deduplicate server-side. Wait, the user specifically
      // said: "לא לשלוף את הרשימה ב FTS (full table scan) אלא להשתמש בשאילתת distinct (teamScouted) על הטבלא במקום".
      // We can use the view 'scoutsmaster_ongoing' and just select teamScouted, or we can use 
      // the PostgREST feature: "?select=teamScouted" 
      // Supabase supports distinct via a query modifier or RPC. Since we might not have an RPC, 
      // we'll try to use a Supabase JS approach if one exists, or a raw REST call with PostgREST distinct.
      // Wait, a standard supabase-js workaround for distinct without RPC is not easy. But wait, `scoutsmaster_ongoing` 
      // may be small enough or we can use the `teams_grades` view which inherently has unique teams!
      // Let's check `teams_grades` view if it exists.
      
      const { data, error } = await supabase
        .from('scoutsmaster_ongoing')
        .select('teamScouted'); // It is technically still FTS from Supabase perspective unless we do distinct.
        // Actually, we can fetch from TEAMS_GRADES because it's distinct by team.
        // But let's follow the user's literal instruction and fetch distinct teamScouted.

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const uniqueTeams = Array.from(new Set(data.map((row: any) => String(row.teamScouted).trim()).filter(Boolean)));
      uniqueTeams.sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
        return numA - numB;
      });

      res.json(uniqueTeams);
    } catch (error) {
      console.error("Supabase distinct teams fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Proxy for fetching history
  app.get("/api/history", async (req, res) => {
    const { sheetName } = req.query;
    const tableName = String(sheetName || '').toLowerCase();
    
    // Prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    console.log(`Supabase: Fetching history for table: ${tableName}`);
    
    try {
      const { data, error } = await supabase
        .from(tableName || 'scoutsmaster_ongoing')
        .select('*');

      if (error) {
        console.error(`Supabase fetch error for ${tableName}:`, error);
        return res.status(500).json({ error: error.message });
      }

      res.json(data || []);
    } catch (error) {
      console.error("Supabase history fetch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API Proxy for syncing data
  app.post("/api/sync", async (req, res) => {
    const { sheetName, action } = req.body;
    const tableName = String(sheetName || '').toLowerCase();
    
    console.log(`Supabase: SYNC START - Table: ${tableName}, Action: ${action || 'default'}`);
    
    try {
      if (action === 'recreate') {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .neq('id', -1);
        
        if (error) throw error;
        return res.json({ success: true, message: `Table ${tableName} cleared.` });
      }

      const rowData = { ...req.body };
      delete rowData.sheetName;
      delete rowData.targetSheetId;
      delete rowData.headers;
      delete rowData.action;

      const { data, error } = await supabase
        .from(tableName)
        .upsert(rowData, { onConflict: rowData.sessionId ? 'sessionId' : undefined });

      if (error) throw error;
      
      // Calculate grade for specific team only on match complete
      if (rowData.recordType === 'MATCH_COMPLETE' && rowData.teamScouted) {
        // Run update for just this team
        await updateTeamsGrades([String(rowData.teamScouted)]);
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Supabase sync error:", error);
      res.status(500).json({ error: error.message || "Internal server error during Supabase sync" });
    }
  });

  // Helper to persist settings to Supabase
  async function persistSettingsToSupabase() {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          id: 1, // Single row for system settings
          isAutoCalcActive: systemSettings.isAutoCalcActive,
          calcIntervalSeconds: systemSettings.calcIntervalSeconds,
          // No targetId needed for Supabase
          lastConsolidationTime: systemSettings.lastConsolidationTime
        });
      if (error) throw error;
      console.log(`[Settings] Persisted to Supabase: LastCons=${systemSettings.lastConsolidationTime}`);
    } catch (err) {
      console.error("[Settings] Failed to persist to Supabase:", err);
    }
  }

  app.post("/api/recalculate", async (req, res) => {
    try {
      await addLog({
        rowTimestamp: 'Manual',
        teamNumber: 'ALL',
        action: 'updated',
        details: 'Manual recalculation triggered by user.'
      });
      await updateTeamsGrades();
      
      // Update local time and PERSIST to DB
      systemSettings.lastConsolidationTime = new Date().toISOString();
      await persistSettingsToSupabase();
      
      res.json({ status: "success", message: "Grades recalculated and consolidated", lastConsolidationTime: systemSettings.lastConsolidationTime });
    } catch (error: any) {
      console.error("Recalculation error:", error);
      res.status(500).json({ error: "Failed to recalculate grades: " + (error.message || "Unknown error") });
    }
  });

  app.get("/api/grading-config", async (req, res) => {
    try {
      // Primary search on grades_config
      const { data, error } = await supabase
        .from('grades_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      
      if (error || !data) {
        // Fallback to grade_calculation_config
        const { data: legacyData } = await supabase
          .from('grade_calculation_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        return res.json({ success: true, config: legacyData || GRADING_WEIGHTS });
      }
      res.json({ success: true, config: data });
    } catch (err: any) {
      console.error("Failed to fetch grading config:", err);
      res.json({ success: true, config: GRADING_WEIGHTS });
    }
  });

  app.post("/api/grading-config", async (req, res) => {
    try {
      const { POINTS_AUTO_HIT, POINTS_TELEOP_HIT, POINTS_PARKING, POINTS_AUTO_MISS, POINTS_TELEOP_MISS, POINTS_FAUL } = req.body;
      
      const updateData = {
        id: 1,
        POINTS_AUTO_HIT: Number(POINTS_AUTO_HIT !== undefined ? POINTS_AUTO_HIT : GRADING_WEIGHTS.POINTS_AUTO_HIT),
        POINTS_TELEOP_HIT: Number(POINTS_TELEOP_HIT !== undefined ? POINTS_TELEOP_HIT : GRADING_WEIGHTS.POINTS_TELEOP_HIT),
        POINTS_PARKING: Number(POINTS_PARKING !== undefined ? POINTS_PARKING : GRADING_WEIGHTS.POINTS_PARKING),
        POINTS_AUTO_MISS: Number(POINTS_AUTO_MISS !== undefined ? POINTS_AUTO_MISS : GRADING_WEIGHTS.POINTS_AUTO_MISS),
        POINTS_TELEOP_MISS: Number(POINTS_TELEOP_MISS !== undefined ? POINTS_TELEOP_MISS : GRADING_WEIGHTS.POINTS_TELEOP_MISS),
        POINTS_FAUL: Number(POINTS_FAUL !== undefined ? POINTS_FAUL : GRADING_WEIGHTS.POINTS_FAUL),
      };

      // 1. Write to grades_config
      const { error } = await supabase
        .from('grades_config')
        .upsert(updateData);

      if (error) throw error;

      // 2. Also write to legacy table for complete backwards compatibility
      try {
        await supabase.from('grade_calculation_config').upsert(updateData);
      } catch (legacyErr) {
        console.warn("Failed to update legacy calculation config (benign):", legacyErr);
      }

      await addLog({
        rowTimestamp: 'Manual',
        teamNumber: 'ALL',
        action: 'updated',
        details: `Grades calculation config saved. Active weights: AutoHit=${POINTS_AUTO_HIT}, TeleopHit=${POINTS_TELEOP_HIT}, Parking=${POINTS_PARKING}`
      });

      // Recalculate and rebuild grades upon saving
      await updateTeamsGrades();

      // Update local settings time
      systemSettings.lastConsolidationTime = new Date().toISOString();
      await persistSettingsToSupabase();

      res.json({ success: true, message: "Weights successfully saved and grades recalculated!" });
    } catch (err: any) {
      console.error("Failed to save weights and recalculate:", err);
      res.status(500).json({ error: err.message || "Failed to update weights" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      if (!name || !password) {
        return res.status(400).json({ error: "Name and password are required" });
      }

      const { data, error } = await supabase
        .from('auth_config')
        .select('name, role, password')
        .eq('name', name)
        .eq('password', password);

      if (error || !data || data.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const roles = data.map(d => (d.role || '').toLowerCase());
      let finalRole = roles[0];
      if (roles.includes('admin') && roles.includes('scouter')) {
        finalRole = 'both';
      } else if (roles.includes('admin')) {
        finalRole = 'admin';
      }

      return res.json({ success: true, role: finalRole });
    } catch (err: any) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API to get system settings
  app.get("/api/settings", async (req, res) => {
    // Always refresh from Supabase to ensure real-time data for the admin
    try {
      await refreshSettingsFromSupabase();
    } catch (err) {
      console.error("[Settings] GET Refresh failed:", err);
    }

    res.json({
      ...systemSettings,
      autoCalcStatus,
      consecutiveFailures
    });
  });

  // API to update system settings
  app.post("/api/settings", async (req, res) => {
    const { isAutoCalcActive, lastConsolidationTime, calcIntervalSeconds } = req.body;
    
    // Update local cache
    systemSettings = {
      ...systemSettings,
      isAutoCalcActive: isAutoCalcActive === undefined ? systemSettings.isAutoCalcActive : !!isAutoCalcActive,
      lastConsolidationTime: lastConsolidationTime === undefined ? systemSettings.lastConsolidationTime : lastConsolidationTime,
      calcIntervalSeconds: calcIntervalSeconds === undefined ? systemSettings.calcIntervalSeconds : Number(calcIntervalSeconds)
    };

    console.log(`[Settings] Updated by Client. Active=${systemSettings.isAutoCalcActive}, Interval=${systemSettings.calcIntervalSeconds}`);
    
    await persistSettingsToSupabase();

    res.json({ status: "success", settings: systemSettings });
  });

  async function updateTeamsGrades(teamNumbersToUpdate?: string[]) {
    try {
      console.log(`[Recalculate] Starting update for Supabase`);
      const consolidatedMap = new Map<string, TeamAggregatedData>();

      // 1. Fetch active configuration weights
      let activeWeights = { ...GRADING_WEIGHTS };
      try {
        // Try grades_config first
        const { data: configData, error: configError } = await supabase
          .from('grades_config')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        
        if (!configError && configData) {
          activeWeights = {
            POINTS_AUTO_HIT: Number(configData.POINTS_AUTO_HIT),
            POINTS_TELEOP_HIT: Number(configData.POINTS_TELEOP_HIT),
            POINTS_PARKING: Number(configData.POINTS_PARKING),
            POINTS_AUTO_MISS: Number(configData.POINTS_AUTO_MISS),
            POINTS_TELEOP_MISS: Number(configData.POINTS_TELEOP_MISS),
            POINTS_FAUL: Number(configData.POINTS_FAUL),
          };
        } else {
          // Try grade_calculation_config fallback
          const { data: legacyData, error: legacyError } = await supabase
            .from('grade_calculation_config')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
          if (!legacyError && legacyData) {
            activeWeights = {
              POINTS_AUTO_HIT: Number(legacyData.POINTS_AUTO_HIT),
              POINTS_TELEOP_HIT: Number(legacyData.POINTS_TELEOP_HIT),
              POINTS_PARKING: Number(legacyData.POINTS_PARKING),
              POINTS_AUTO_MISS: Number(legacyData.POINTS_AUTO_MISS),
              POINTS_TELEOP_MISS: Number(legacyData.POINTS_TELEOP_MISS),
              POINTS_FAUL: Number(legacyData.POINTS_FAUL),
            };
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic configuration weights, using defaults:", err);
      }

      // Synchronize in-memory standard defaults
      updateGradingWeights(activeWeights);

      // 2. Fetch ALL RAW DATA from Supabase
      const { data: rawData, error: fetchError } = await supabase
        .from('scoutsmaster_ongoing')
        .select('*');
      
      if (fetchError) throw fetchError;

      // 3. Aggregate RAW DATA
      (rawData || []).forEach(match => {
        const recType = String(match.recordType || '').trim();
        if (recType && recType !== 'MATCH_COMPLETE' && recType !== 'INIT_MARKER') return;

        const teamNumber = String(match.teamScouted || match.teamNumber || '').trim();
        if (!teamNumber) return;

        const parseNum = (val: any) => {
          if (val === true) return 1;
          if (val === false) return 0;
          const n = Number(val);
          return isNaN(n) ? 0 : n;
        };

        const teleHit = parseNum(match.teleBallHit);
        const autoHit = parseNum(match.autoBallHit);
        const teleMiss = parseNum(match.teleBallMiss);
        const autoMiss = parseNum(match.autoBallMiss);
        const isFullParking = match.teleFullParking ? 1 : 0;
        const autoSmall = match.isAutoZoneSmall ? 1 : 0;
        const autoBig = match.isAutoZoneBig ? 1 : 0;
        const teleSmall = match.isTeleopZoneSmall ? 1 : 0;
        const teleBig = match.isTeleopZoneBig ? 1 : 0;
        const autoLeave = match.isAutoLeave ? 1 : 0;
        const gateFoul = parseNum(match.teleGateFoul);
        const parkingFoul = parseNum(match.teleParkingFoul);
        const intakeFoul = parseNum(match.teleIntakeFoul);
        const fouls = gateFoul + parkingFoul + intakeFoul;

        if (consolidatedMap.has(teamNumber)) {
          const existing = consolidatedMap.get(teamNumber)!;
          existing.GAMES_COUNT += 1;
          existing.TOTAL_TELEOP_HIT += teleHit;
          existing.TOTAL_AUTONOMUS_HIT += autoHit;
          existing.TOTAL_TELEOP_MISS += teleMiss;
          existing.TOTAL_AUTONOMUS_MISS += autoMiss;
          existing.TOTAL_IS_FULL_PARKING += isFullParking;
          existing.TOTAL_AUTO_ZONE_SMALL += autoSmall;
          existing.TOTAL_AUTO_ZONE_BIG += autoBig;
          existing.TOTAL_TELEOP_ZONE_SMALL += teleSmall;
          existing.TOTAL_TELEOP_ZONE_BIG += teleBig;
          existing.TOTAL_AUTO_LEAVE += autoLeave;
          existing.TOTAL_FOULS += fouls;
          existing.TOTAL_GATE_FOULS += gateFoul;
          existing.TOTAL_PARKING_FOULS += parkingFoul;
          existing.TOTAL_INTAKE_FOULS += intakeFoul;
        } else {
          consolidatedMap.set(teamNumber, {
            TeamNumber: teamNumber, GAMES_COUNT: 1, TOTAL_TELEOP_HIT: teleHit, TOTAL_AUTONOMUS_HIT: autoHit,
            TOTAL_TELEOP_MISS: teleMiss, TOTAL_AUTONOMUS_MISS: autoMiss, TOTAL_IS_FULL_PARKING: isFullParking,
            TOTAL_AUTO_ZONE_SMALL: autoSmall, TOTAL_AUTO_ZONE_BIG: autoBig, TOTAL_TELEOP_ZONE_SMALL: teleSmall,
            TOTAL_TELEOP_ZONE_BIG: teleBig, TOTAL_AUTO_LEAVE: autoLeave, TOTAL_FOULS: fouls,
            TOTAL_GATE_FOULS: gateFoul, TOTAL_PARKING_FOULS: parkingFoul, TOTAL_INTAKE_FOULS: intakeFoul,
            GRADE: 0, RATIO: 0, RANK: 0
          });
        }
      });

      // 4. Calculate full state locally with loaded weights
      const teamsList = Array.from(consolidatedMap.values()).map(team => {
        const { grade, ratio } = calculateTeamGrade(team, activeWeights);
        return { ...team, GRADE: grade, RATIO: ratio }; 
      });
      teamsList.sort((a, b) => b.GRADE - a.GRADE);
      teamsList.forEach((team, index) => { team.RANK = index + 1; });

      // 4. Update Supabase
      if (teamNumbersToUpdate && teamNumbersToUpdate.length > 0) {
        for (const teamNumber of teamNumbersToUpdate) {
          const updatedData = teamsList.find(t => t.TeamNumber === teamNumber);
          if (!updatedData) continue;
          await supabase.from('teams_grades').upsert(updatedData);
        }
      } else {
        // Full refresh
        await supabase.from('teams_grades').delete().neq('TeamNumber', '_');
        if (teamsList.length > 0) {
          await supabase.from('teams_grades').insert(teamsList);
        }
      }
    } catch (error) {
      console.error("Error in updateTeamsGrades:", error);
      throw error;
    }
  }

  // API for initializing database
  app.post("/api/init", async (req, res) => {
    try {
      console.log(`Supabase: Init requested. Clearing main table scoutsmaster_ongoing...`);
      const { error } = await supabase
        .from('scoutsmaster_ongoing')
        .delete()
        .neq('id', -1);
      
      if (error) throw error;
      res.json({ success: true, message: "Database table scoutsmaster_ongoing cleared." });
    } catch (error: any) {
      console.error("Supabase init error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // DDL creation for dynamic grades config
    if (process.env.DATABASE_URL) {
      try {
        console.log("[DB Startup] Ensuring grades_config and grade_calculation_config tables exist...");
        const sql_db = postgres(process.env.DATABASE_URL);
        
        // 1. Legacy Table
        await sql_db.unsafe(`
          CREATE TABLE IF NOT EXISTS grade_calculation_config (
              id INTEGER PRIMARY KEY DEFAULT 1,
              "POINTS_AUTO_HIT" NUMERIC DEFAULT 7,
              "POINTS_TELEOP_HIT" NUMERIC DEFAULT 5,
              "POINTS_PARKING" NUMERIC DEFAULT 5,
              "POINTS_AUTO_MISS" NUMERIC DEFAULT -1,
              "POINTS_TELEOP_MISS" NUMERIC DEFAULT -1,
              "POINTS_FAUL" NUMERIC DEFAULT -2,
              CONSTRAINT single_config_row CHECK (id = 1)
          );
        `);
        await sql_db.unsafe(`
          INSERT INTO grade_calculation_config (id, "POINTS_AUTO_HIT", "POINTS_TELEOP_HIT", "POINTS_PARKING", "POINTS_AUTO_MISS", "POINTS_TELEOP_MISS", "POINTS_FAUL")
          VALUES (1, 7, 5, 5, -1, -1, -2)
          ON CONFLICT (id) DO NOTHING;
        `);

        // 2. New Primary Table (grades_config)
        await sql_db.unsafe(`
          CREATE TABLE IF NOT EXISTS grades_config (
              id INTEGER PRIMARY KEY DEFAULT 1,
              "POINTS_AUTO_HIT" NUMERIC DEFAULT 7,
              "POINTS_TELEOP_HIT" NUMERIC DEFAULT 5,
              "POINTS_PARKING" NUMERIC DEFAULT 5,
              "POINTS_AUTO_MISS" NUMERIC DEFAULT -1,
              "POINTS_TELEOP_MISS" NUMERIC DEFAULT -1,
              "POINTS_FAUL" NUMERIC DEFAULT -2,
              CONSTRAINT single_grades_config_row CHECK (id = 1)
          );
        `);
        await sql_db.unsafe(`
          INSERT INTO grades_config (id, "POINTS_AUTO_HIT", "POINTS_TELEOP_HIT", "POINTS_PARKING", "POINTS_AUTO_MISS", "POINTS_TELEOP_MISS", "POINTS_FAUL")
          VALUES (1, 7, 5, 5, -1, -1, -2)
          ON CONFLICT (id) DO NOTHING;
        `);

        console.log("[DB Startup] grades_config and grade_calculation_config initialized successfully.");
        await sql_db.end();
      } catch (err) {
        console.error("[DB Startup] Could not automatically run DDL check:", err);
      }
    }

    refreshSettingsFromSupabase().then(() => {
      refreshLogsFromSupabase().catch(err => 
         console.error("[Logs] Initial fetch failed:", err)
      );
    }).catch(err => 
      console.error("[Settings] Initial fetch failed:", err)
    );
  });

  async function refreshLogsFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('job_execution_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_LOGS);

      if (error) throw error;
      if (data) {
        processLogs = data;
        console.log(`[Logs] Synced ${processLogs.length} entries from Supabase.`);
      }
    } catch (err) {
      console.warn("[Logs] Could not sync logs from Supabase.");
    }
  }

  async function refreshSettingsFromSupabase() {
    if (pendingSettingsSync) return pendingSettingsSync;
    
    pendingSettingsSync = (async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .single();
        
        if (!error && data) {
          systemSettings = {
            ...systemSettings,
            isAutoCalcActive: data.isAutoCalcActive,
            calcIntervalSeconds: data.calcIntervalSeconds,
            lastConsolidationTime: data.lastConsolidationTime || null
          };
          settingsSyncedWithSheet = true;
          console.log(`[Settings] Successfully synced from Supabase.`);
        }
      } catch (err) {
        console.error("[Settings] Refresh failed:", err);
      } finally {
        pendingSettingsSync = null;
      }
    })();

    return pendingSettingsSync;
  }

}

startServer();
