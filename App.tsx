import React, { useState } from 'react';
import dayjs from 'dayjs';
import { ScoutingPhase, User, AutoData, TeleOpData, SpreadsheetRow, Language } from './types';
import AuthBinding from './components/auth/AuthBinding';
import AutoBinding from './components/auto/AutoBinding';
import TeleOpBinding from './components/teleop/TeleOpBinding';
import SummaryBinding from './components/summary/SummaryBinding';
import AdminBinding from './components/admin/AdminBinding';
import { Layout } from './components/Layout';
import { AppTranslation_EN, AppTranslation_HE, AuthTranslation_EN, AuthTranslation_HE } from './components/translations';
import { calculateTeamGrade } from './lib/gradingEngine';
import { motion } from 'motion/react';
import { 
  ClipboardList, 
  Radio, 
  Cpu, 
  BarChart3,
  ArrowLeft,
  X,
  RefreshCw,
  Table as TableIcon,
  Database,
  AlertCircle,
  Sliders,
  HelpCircle
} from 'lucide-react';
import {ENV}  from "./constants";


const SHEET_NAME = 'scoutsmaster_ongoing'; 

const ALL_HEADERS = [
  // Hebrew Headers (Matching demo-table order)
  'isAutoZoneSmall', 'isAutoZoneBig', 
  'isAutoLeave', 'isTeleopZoneSmall', 'isTeleopZoneBig', 'teleFullParking', 
  // Internal App Headers
  'sessionId', 'timestamp', 'sessionStartTime', 'sessionEndTime', 'name', 
  'allianceColor', 'matchNumber', 'teamScouted', 'role', 
  'autoOpenGate', 'autoIntakeUsed', 'autoBallHit', 'autoBallMiss', 'autoNotes',
  'teleBallHit', 
  'teleBallMiss',
  'teleFieldAwareness',
  'teleLateTranslation', 'teleOverallSuccess', 'teleFastRebound', 'teleIsFrozen', 'teleConfused', 'teleStoppedScoring',
  'teleGateFoul', 'teleParkingFoul', 'teleIntakeFoul', 'teleFoulCount',
  'teleFullParking',
  'teleHumanPlayer', 'teleFloor', 'teleComments', 'aiAnalysis', 'recordType'
];

const generateGUID = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [phase, setPhase] = useState<ScoutingPhase>(ScoutingPhase.AUTH);
  console.log("App: Rendering phase", phase);
  const [language, setLanguage] = useState<Language>(Language.HE);
  const [user, setUser] = useState<User | null>(null);
  const [autoData, setAutoData] = useState<AutoData | null>(null);
  const [teleopData, setTeleopData] = useState<TeleOpData | null>(null);
  const [history, setHistory] = useState<SpreadsheetRow[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [initStatus, setInitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const [lastName, setLastName] = useState('');
  const [lastMatchNumber, setLastMatchNumber] = useState('1');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [seedStatus, setSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [seedError, setSeedError] = useState<string | null>(null);
  const [recalcStatus, setRecalcStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [lastConsolidationTime, setLastConsolidationTime] = useState<string | null>(null);
  const [teamsGrades, setTeamsGrades] = useState<any[]>([]);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [settings, setSettings] = useState({
    isAutoCalcActive: false,
    calcIntervalSeconds: 80,
    lastConsolidationTime: null as string | null,
    autoCalcStatus: 'idle' as 'idle' | 'running' | 'error',
    consecutiveFailures: 0
  });

  // Grades Config states and simulation hooks in App.tsx
  const [isWeightsModalOpen, setIsWeightsModalOpen] = useState(false);
  const [sliderWeights, setSliderWeights] = useState({
    POINTS_AUTO_HIT: 7,
    POINTS_TELEOP_HIT: 5,
    POINTS_PARKING: 5,
    POINTS_AUTO_MISS: -1,
    POINTS_TELEOP_MISS: -1,
    POINTS_FAUL: -2
  });
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [showWeightsHelp, setShowWeightsHelp] = useState(false);

  const fetchWeights = async () => {
    try {
      const res = await fetch('/api/grading-config');
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.config) {
          setSliderWeights({
            POINTS_AUTO_HIT: Number(body.config.POINTS_AUTO_HIT),
            POINTS_TELEOP_HIT: Number(body.config.POINTS_TELEOP_HIT),
            POINTS_PARKING: Number(body.config.POINTS_PARKING),
            POINTS_AUTO_MISS: Number(body.config.POINTS_AUTO_MISS),
            POINTS_TELEOP_MISS: Number(body.config.POINTS_TELEOP_MISS),
            POINTS_FAUL: Number(body.config.POINTS_FAUL)
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch grading configuration weights", err);
    }
  };

  const handleSaveWeights = async () => {
    setIsSavingWeights(true);
    try {
      const res = await fetch('/api/grading-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sliderWeights)
      });
      if (res.ok) {
        setIsWeightsModalOpen(false);
        // Recalculate and rebuild grades on server, which fetches latest grades
        await handleRecalculate();
        alert(language === Language.HE ? 'הגדרות נשמרו בהצלחה והציונים חושבו מחדש!' : 'Weights successfully saved and grades recalculated!');
      } else {
        alert(language === Language.HE ? 'שגיאה בשמירת הגדרות' : 'Failed to save weights');
      }
    } catch (err) {
      console.error(err);
      alert(language === Language.HE ? 'שגיאה בתקשורת עם השרת' : 'Connection error');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const simulatedTeams = React.useMemo(() => {
    if (!teamsGrades || teamsGrades.length === 0) return [];
    
    const results = teamsGrades.map((team: any) => {
      const mappedData = {
        TeamNumber: team.TeamNumber,
        GAMES_COUNT: Number(team.GAMES_COUNT || 1),
        TOTAL_TELEOP_HIT: Number(team.TOTAL_TELEOP_HIT || 0),
        TOTAL_AUTONOMUS_HIT: Number(team.TOTAL_AUTONOMUS_HIT || 0),
        TOTAL_TELEOP_MISS: Number(team.TOTAL_TELEOP_MISS || 0),
        TOTAL_AUTONOMUS_MISS: Number(team.TOTAL_AUTONOMUS_MISS || 0),
        TOTAL_IS_FULL_PARKING: Number(team.TOTAL_IS_FULL_PARKING || 0),
        TOTAL_AUTO_ZONE_SMALL: Number(team.TOTAL_AUTO_ZONE_SMALL || 0),
        TOTAL_AUTO_ZONE_BIG: Number(team.TOTAL_AUTO_ZONE_BIG || 0),
        TOTAL_TELEOP_ZONE_SMALL: Number(team.TOTAL_TELEOP_ZONE_SMALL || 0),
        TOTAL_TELEOP_ZONE_BIG: Number(team.TOTAL_TELEOP_ZONE_BIG || 0),
        TOTAL_AUTO_LEAVE: Number(team.TOTAL_AUTO_LEAVE || 0),
        TOTAL_FOULS: Number(team.TOTAL_FOULS || 0),
        TOTAL_GATE_FOULS: Number(team.TOTAL_GATE_FOULS || 0),
        TOTAL_PARKING_FOULS: Number(team.TOTAL_PARKING_FOULS || 0),
        TOTAL_INTAKE_FOULS: Number(team.TOTAL_INTAKE_FOULS || 0),
        GRADE: Number(team.GRADE || 0),
        RATIO: Number(team.RATIO || 0),
        RANK: Number(team.RANK || 1)
      };
      
      const { grade, ratio } = calculateTeamGrade(mappedData, sliderWeights);
      return {
        ...team,
        SIMULATED_GRADE: grade,
        SIMULATED_RATIO: ratio
      };
    });

    results.sort((a, b) => b.SIMULATED_GRADE - a.SIMULATED_GRADE);

    return results.map((team, idx) => ({
      ...team,
      SIMULATED_RANK: idx + 1
    }));
  }, [teamsGrades, sliderWeights]);

  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/system-status');
        const contentType = res.headers.get('content-type');
        if (res.ok && contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setIsSystemPaused(data.isSystemPaused);
        } else if (!res.ok) {
          console.warn(`System status check failed with status: ${res.status}`);
        } else {
          const text = await res.text();
          console.error(`System status check returned non-JSON response (type: ${contentType}):`, text.substring(0, 100));
        }
      } catch (e) {
        console.error("Failed to check system status", e);
      }
    };
    
    // Check status once on mount
    checkStatus();

    // Only poll status if we are in Admin or Management views
    if (phase === ScoutingPhase.MANAGEMENT || phase === ScoutingPhase.ADMIN) {
      const interval = setInterval(checkStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const fetchTeamsGrades = React.useCallback(async () => {
    setIsLoadingGrades(true);
    try {
      const response = await fetch(`/api/history?sheetName=TEAMS_GRADES`);
      if (response.ok) {
        const data = await response.json();
        setTeamsGrades(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching TEAMS_GRADES:', error);
    } finally {
      setIsLoadingGrades(false);
    }
  }, []);

  const fetchSettings = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings({
          isAutoCalcActive: data.isAutoCalcActive,
          calcIntervalSeconds: Number(data.calcIntervalSeconds) || 80,
          lastConsolidationTime: data.lastConsolidationTime,
          autoCalcStatus: data.autoCalcStatus || 'idle',
          consecutiveFailures: data.consecutiveFailures || 0
        });
        if (data.lastConsolidationTime) {
          setLastConsolidationTime(new Date(data.lastConsolidationTime).toLocaleString());
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // Fetch settings once when entering management or admin view
  React.useEffect(() => {
    if (phase === ScoutingPhase.MANAGEMENT || phase === ScoutingPhase.ADMIN) {
      fetchSettings();
      fetchTeamsGrades();

      // Poll settings for lastConsolidationTime and status every 60 seconds
      const pollInterval = setInterval(() => {
        fetchSettings();
      }, 60000); 

      return () => clearInterval(pollInterval);
    }
  }, [phase, fetchSettings, fetchTeamsGrades]);

  const handleUpdateSettings = async (newSettings: { isAutoCalcActive?: boolean }) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      fetchSettings();
    }
  };

  const handleSeedData = async () => {
    setShowSeedConfirm(false); // Close modal
    setSeedStatus('loading');
    setSeedError(null);
    console.log('Seeding: Process started via custom confirm');

    try {
      console.log('Seeding: Starting reset...');
      // Step 1: Reset system data (clears reports, logs, grades but keeps settings and users)
      const resetResp = await fetch('/api/admin/reset-system', { method: 'POST' });
      if (!resetResp.ok) {
        const errorData = await resetResp.json();
        throw new Error(errorData.error || 'Failed to reset system data');
      }

      console.log('Seeding: Reset complete. Starting row generation...');
      const teams = ['15811', '15928', '25041', '6798', '16473', '18833'];
      const scouterNames = ['TestScouter1', 'TestScouter2', 'TestScouter3'];

      // Get fresh history (should be empty now)
      let currentHistory: SpreadsheetRow[] = [];

      let seededCount = 0;
      let skippedCount = 0;

      for (let i = 1; i <= 10; i++) {
        const matchNum = i.toString();
        const startIndex = (i - 1) % teams.length;
        const matchTeams = [];
        for(let j=0; j<4; j++) {
           matchTeams.push(teams[(startIndex + j) % teams.length]);
        }

        for (const team of matchTeams) {
          // Check restrictions
          const restriction = checkScoutingRestrictions(currentHistory, team, matchNum, 'TestSeed');
          if (restriction) {
            console.log(`Seeding: Skipping Team ${team} Match ${matchNum}: ${restriction}`);
            skippedCount++;
            continue;
          }

          console.log(`Seeding: Creating record for Team ${team} Match ${matchNum}...`);
          const teleGateFoul = Math.random() > 0.7;
          const teleParkingFoul = Math.random() > 0.7;
          const teleIntakeFoul = Math.random() > 0.7;
          
          const row = {
            sessionId: `seed-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            sessionStartTime: new Date().toISOString(),
            sessionEndTime: new Date().toISOString(),
            name: scouterNames[Math.floor(Math.random() * scouterNames.length)],
            matchNumber: matchNum,
            teamScouted: team,
            role: 'scouter',
            isAutoLeave: Math.random() > 0.3,
            isAutoZoneSmall: Math.random() > 0.5,
            isAutoZoneBig: Math.random() > 0.5,
            autoOpenGate: Math.random() > 0.8,
            autoIntakeUsed: Math.random() > 0.5,
            autoBallHit: Math.floor(Math.random() * 5),
            autoBallMiss: Math.floor(Math.random() * 3),
            autoNotes: 'Automated test data',
            teleBallHit: Math.floor(Math.random() * 15),
            isTeleopZoneSmall: Math.random() > 0.5,
            isTeleopZoneBig: Math.random() > 0.5,
            teleBallMiss: Math.floor(Math.random() * 5),
            teleFieldAwareness: Math.random() > 0.2,
            teleLateTranslation: Math.random() > 0.8,
            teleOverallSuccess: true,
            teleFastRebound: Math.random() > 0.5,
            teleIsFrozen: Math.random() > 0.9,
            teleConfused: Math.random() > 0.9,
            teleStoppedScoring: Math.random() > 0.9,
            teleGateFoul,
            teleParkingFoul,
            teleIntakeFoul,
            teleFoulCount: Math.floor(Math.random() * 3),
            teleFullParking: Math.random() > 0.5,
            teleHumanPlayer: Math.random() > 0.5,
            teleFloor: Math.random() > 0.5,
            teleComments: 'Test comments',
            aiAnalysis: 'Test analysis',
            recordType: 'MATCH_COMPLETE',
            sheetName: SHEET_NAME,
            headers: ALL_HEADERS
          };

          const resp = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row)
          });
          if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
          
          // Update local simulated history so next iteration respects it
          currentHistory.push({
            ...row,
            scouterName: row.name // for history mapping
          } as any);

          seededCount++;
          await new Promise(r => setTimeout(r, 200));
        }
      }

      console.log(`Seeding complete: ${seededCount} created, ${skippedCount} skipped.`);
      setSeedStatus('success');
      setTimeout(() => setSeedStatus('idle'), 3000);
      fetchHistory();
      fetchTeamsGrades();
      fetchSettings();
    } catch (error) {
      console.error('Seeding failed:', error);
      setSeedError(error instanceof Error ? error.message : String(error));
      setSeedStatus('error');
    }
  };

  const handleRecalculate = async () => {
    setRecalcStatus('loading');
    setRecalcError(null);
    try {
      const response = await fetch('/api/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (response.ok) {
        setLastConsolidationTime(new Date().toLocaleString());
        setRecalcStatus('success');
        setTimeout(() => setRecalcStatus('idle'), 3000);
        fetchTeamsGrades();
      } else {
        throw new Error(`Failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Recalculation error:', error);
      setRecalcError(error instanceof Error ? error.message : String(error));
      setRecalcStatus('error');
    }
  };

  const t = language === Language.HE ? AppTranslation_HE : AppTranslation_EN;

  const handleDeleteGame = () => {
    setUser(null);
    setAutoData(null);
    setTeleopData(null);
    setSummaryError(null);
    setAuthError(null);
    setLastName('');
    setLastMatchNumber('1');
    setResetKey(prev => prev + 1);
    setIsUpdateMode(false);
    setIsSubmitting(false);
    setPhase(ScoutingPhase.AUTH);
  };

  const handleUpdateMetadata = () => {
    setSummaryError(null);
    setIsUpdateMode(true);
    setIsSubmitting(false);
    setPhase(ScoutingPhase.AUTH);
  };

  const checkScoutingRestrictions = (historyData: SpreadsheetRow[], team: string, match: string, scouterName: string) => {
    const cleanTeam = String(team || '').trim();
    const cleanMatch = String(match || '').trim();
    const cleanName = String(scouterName || '').trim().toLowerCase();

    // 1. Check if team already exists for this match (Team unique per match)
    const teamAlreadyScouted = historyData.some(row => {
      const rowTeam = String(row.teamScouted || '').trim();
      const rowMatch = String(row.matchNumber || '').trim();
      const rowRecordType = row['recordType'];
      return rowRecordType === 'MATCH_COMPLETE' && rowTeam === cleanTeam && rowMatch === cleanMatch;
    });

    if (teamAlreadyScouted) return 'TEAM_EXISTS';

    // 2. Check if this specific scouter already scouted this match/team (for backward compatibility/extra safety)
    const scouterAlreadyScouted = historyData.some(row => {
      const rowTeam = String(row.teamScouted || '').trim();
      const rowMatch = String(row.matchNumber || '').trim();
      const rowName = String(row.name || '').trim().toLowerCase();
      const rowRecordType = row['recordType'];
      return rowRecordType === 'MATCH_COMPLETE' && rowTeam === cleanTeam && rowMatch === cleanMatch && rowName === cleanName;
    });
    
    if (scouterAlreadyScouted) return 'DUPLICATE_REPORT';

    // 3. Check how many unique teams are in this match (Max 4 teams per match)
    const matchTeams = new Set(
      historyData
        .filter(row => row['recordType'] === 'MATCH_COMPLETE' && String(row.matchNumber || '').trim() === cleanMatch)
        .map(row => String(row.teamScouted || '').trim())
    );

    if (matchTeams.size >= 4 && !matchTeams.has(cleanTeam)) {
      return 'MATCH_FULL';
    }

    return null;
  };

  // Removed initial fetchHistory on mount to comply with "check only on events" request.
  // History is now fetched explicitly during auth submit or summary submit.

  const handleLogout = () => {
    handleDeleteGame();
  };

  const syncToSupabase = async (data: Partial<SpreadsheetRow>) => {
    setSyncStatus('syncing');

    const payload = { ...data, sheetName: SHEET_NAME, headers: ALL_HEADERS };

    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    }
  };

  const initializeSheet = async () => {
    console.log('Initializing/Recreating sheet:', SHEET_NAME);
    try {
      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recreate',
          sheetName: SHEET_NAME,
          headers: ALL_HEADERS
        })
      });
      if (resp.ok) {
        console.log('Sheet initialized successfully');
        // Now that it exists, fetch history again (will likely be empty but headers will exist)
        const historyResp = await fetch(`/api/history?sheetName=${SHEET_NAME}`);
        if (historyResp.ok) {
          const result = await historyResp.json().catch(() => []);
          const dataArray = Array.isArray(result) ? result : (result.data && Array.isArray(result.data) ? result.data : []);
          setHistory(dataArray);
        }
      } else {
        console.error('Failed to initialize sheet:', await resp.text());
      }
    } catch (error) {
      console.error('Error during sheet initialization:', error);
    }
  };

  const syncScoutData = async (
    recordType: 'SESSION_START' | 'AUTO_COMPLETE' | 'TELEOP_COMPLETE' | 'MATCH_COMPLETE',
    currentAuto?: AutoData | null,
    currentTeleop?: TeleOpData | null,
    currentUser?: User | null,
    aiAnalysisText?: string | null
  ) => {
    const activeUser = currentUser || user;
    if (!activeUser) return;

    const row: Partial<SpreadsheetRow> = {
      sessionId: activeUser.sessionId || '',
      timestamp: new Date().toISOString(),
      sessionStartTime: activeUser.sessionStartTime ? new Date(activeUser.sessionStartTime).toISOString() : '',
      sessionEndTime: recordType === 'MATCH_COMPLETE' ? new Date().toISOString() : '',
      name: activeUser.name,
      matchNumber: currentAuto?.matchNumber || activeUser.matchNumber,
      allianceColor: activeUser.allianceColor || '',
      teamScouted: currentAuto?.teamScouted || activeUser.teamScouted,
      role: activeUser.role,
      recordType
    };

    if (currentAuto) {
      Object.assign(row, {
        isAutoZoneSmall: currentAuto.isZoneSmall,
        isAutoZoneBig: currentAuto.isZoneBig,
        isAutoLeave: currentAuto.leave,
        autoOpenGate: currentAuto.openGate,
        autoIntakeUsed: currentAuto.intake,
        autoBallHit: currentAuto.ballsSide,
        autoBallMiss: currentAuto.ballsMissed,
        autoNotes: currentAuto.freeText,
      });
    }

    if (currentTeleop) {
      Object.assign(row, {
        teleBallHit: currentTeleop.intake,
        isTeleopZoneSmall: currentTeleop.isSmallTriangle,
        isTeleopZoneBig: currentTeleop.isBigTriangle,
        teleBallMiss: currentTeleop.gateOverflow,
        teleFieldAwareness: currentTeleop.fieldAwareness,
        teleLateTranslation: currentTeleop.lateTranslation,
        teleOverallSuccess: currentTeleop.success,
        teleFastRebound: currentTeleop.fastRebound,
        teleIsFrozen: currentTeleop.isFrozen,
        teleConfused: currentTeleop.confused,
        teleStoppedScoring: currentTeleop.stoppedScoring,
        teleGateFoul: currentTeleop.gateFoul,
        teleParkingFoul: currentTeleop.parkingFoul,
        teleIntakeFoul: currentTeleop.intakeFoul,
        teleFullParking: currentTeleop.fullParkingType,
        teleFoulCount: (currentTeleop.gateFoul ? 1 : 0) + (currentTeleop.parkingFoul ? 1 : 0) + (currentTeleop.intakeFoul ? 1 : 0),
        teleHumanPlayer: currentTeleop.humanPlayer,
        teleFloor: currentTeleop.floor,
        teleComments: currentTeleop.comments,
        aiAnalysis: aiAnalysisText || '',
      });
    }

    // Only sync to Supabase for the final record to avoid multiple rows per session
    if (recordType === 'MATCH_COMPLETE') {
      await syncToSupabase(row);
    } else {
      console.log(`Local sync: ${recordType} - Data updated locally, will sync to cloud on finish.`);
    }
  };

  const fetchHistory = async () => {
    setIsFetchingHistory(true);
    console.log('fetchHistory: Requesting data for table:', SHEET_NAME);
    try {
      const response = await fetch(`/api/history?sheetName=${SHEET_NAME}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('History data received:', result);
        const dataArray = Array.isArray(result) ? result : [];
        setHistory(dataArray);
      } else {
        console.error('Fetch history failed with status:', response.status);
        setHistory([]);
      }
    } catch (error) {
      console.error('Fetch history error:', error);
      setHistory([]);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleAuthSubmit = async (userData: User, mode?: 'investigate' | 'manage') => {
    setAuthError(null);
    setSummaryError(null);
    
    if (userData.role === 'admin') {
      const sessionStartTime = Date.now();
      const sessionId = generateGUID();
      const enrichedUser: User = { ...userData, sessionId, sessionStartTime };
      setUser(enrichedUser);
      if (mode === 'manage') {
        setPhase(ScoutingPhase.MANAGEMENT);
      } else {
        setPhase(ScoutingPhase.ADMIN);
        fetchHistory();
      }
    } else {
      // Fetch fresh history explicitly on auth event
      setIsFetchingHistory(true);
      let latestHistory = history;
      try {
        const cacheBuster = Date.now();
        const response = await fetch(`/api/history?sheetName=${SHEET_NAME}&_=${cacheBuster}`);
        if (response.ok) {
          latestHistory = await response.json();
          setHistory(latestHistory);
        }
      } catch (e) {
        console.error("Failed to fetch history during auth submit", e);
      } finally {
        setIsFetchingHistory(false);
      }

      // Check for restrictions for the NEW values provided
      // If we are in update mode and the team/match are the same, we ignore the restriction (it's ourselves)
      const isActuallyTheSameSession = isUpdateMode && user && 
                                       String(userData.teamScouted).trim() === String(user.teamScouted).trim() && 
                                       String(userData.matchNumber).trim() === String(user.matchNumber).trim();

      const restriction = checkScoutingRestrictions(latestHistory, userData.teamScouted, userData.matchNumber, userData.name);
      
      if (restriction && !isActuallyTheSameSession) {
        const authT: any = language === Language.HE ? AuthTranslation_HE : AuthTranslation_EN;
        if (restriction === 'TEAM_EXISTS') {
          setAuthError(authT.teamExistsError.replace('{team}', userData.teamScouted).replace('{match}', userData.matchNumber));
        } else if (restriction === 'MATCH_FULL') {
          setAuthError(authT.matchLimitError.replace('{match}', userData.matchNumber));
        } else {
          setAuthError(authT.duplicateError.replace('{team}', userData.teamScouted).replace('{match}', userData.matchNumber).replace('{name}', userData.name));
        }
        return;
      }

      if (isUpdateMode) {
        if (isActuallyTheSameSession) {
          // Just a metadata fix (scouter name, alliance color, etc.) - keep existing data and return to Summary
          const updatedUser = {
            ...userData,
            sessionId: user?.sessionId || generateGUID(),
            sessionStartTime: user?.sessionStartTime || Date.now()
          };
          
          setUser(updatedUser);

          // Update autoData and teleopData to match new metadata (if they exist)
          if (autoData) {
            setAutoData({
              ...autoData,
              matchNumber: updatedUser.matchNumber,
              teamScouted: updatedUser.teamScouted
            });
          }

          setIsUpdateMode(false);
          setPhase(ScoutingPhase.SUMMARY);
        } else {
          // They changed team/match. This is now effectively a NEW session.
          // Drop old data and start from scratch as requested.
          const sessionStartTime = Date.now();
          const sessionId = generateGUID();
          const enrichedUser: User = { ...userData, sessionId, sessionStartTime };
          
          setUser(enrichedUser);
          setAutoData(null);
          setTeleopData(null);
          setIsUpdateMode(false);
          setPhase(ScoutingPhase.AUTONOMOUS);
          syncScoutData('SESSION_START', null, null, enrichedUser);
        }
      } else {
        // Normal new session flow
        const sessionStartTime = Date.now();
        const sessionId = generateGUID();
        const enrichedUser: User = { ...userData, sessionId, sessionStartTime };
        setUser(enrichedUser);
        setPhase(ScoutingPhase.AUTONOMOUS);
        syncScoutData('SESSION_START', null, null, enrichedUser);
      }
    }
  };

  const handlePhaseChange = (newPhase: ScoutingPhase) => {
    if (newPhase === ScoutingPhase.ADMIN) {
      fetchHistory();
    }
    setPhase(newPhase);
  };

  const handleInitSheet = async () => {
    setInitStatus('loading');
    setInitError(null);
    try {
      const timestamp = dayjs().format('DDMMYYYYHHmm');
      const newSheetName = `${SHEET_NAME} ${timestamp}`;
      
      const response = await fetch('/api/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldSheetName: SHEET_NAME,
          newSheetName: newSheetName,
          headers: ALL_HEADERS
        })
      });

      if (response.ok) {
        // Proactively ensure headers are in the new sheet by sending a dummy sync
        try {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sheetName: SHEET_NAME,
              headers: ALL_HEADERS,
              recordType: 'INIT_MARKER',
              timestamp: dayjs().toISOString(),
              name: 'SYSTEM',
              role: 'admin'
            })
          });
        } catch (syncError) {
          console.warn('Proactive header sync failed, but init succeeded:', syncError);
        }

        setInitStatus('success');
        setTimeout(() => setInitStatus('idle'), 3000);
        fetchHistory(); // Refresh history
      } else {
        throw new Error(`Init failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Init sheet error:', error);
      setInitError(error instanceof Error ? error.message : String(error));
      setInitStatus('error');
    }
  };

  const renderPhase = () => {
    switch (phase) {
      case ScoutingPhase.AUTH: 
        const isRestrictionError = authError && (
          authError.includes('already exists') || 
          authError.includes('already has a report') || 
          authError.includes('already has 4 teams') ||
          authError.includes('כבר קיים דיווח') ||
          authError.includes('יש כבר 4 קבוצות')
        );

        return <AuthBinding 
          key={resetKey}
          onSubmit={handleAuthSubmit} 
          language={language} 
          initialName={isUpdateMode ? user?.name : lastName}
          initialMatchNumber={isUpdateMode ? user?.matchNumber : lastMatchNumber}
          initialTeamNumber={isUpdateMode ? user?.teamScouted : ''}
          initialRole={isUpdateMode ? user?.role : 'scouter'}
          initialAllianceColor={isUpdateMode ? user?.allianceColor : 'Red'}
          history={history}
          externalError={authError}
          isRestrictionError={!!isRestrictionError}
          onDeleteGame={handleDeleteGame}
          onUpdateMetadata={handleUpdateMetadata}
          isUpdateMode={isUpdateMode}
        />;
      case ScoutingPhase.AUTONOMOUS: 
        return <AutoBinding 
          language={language}
          onNext={(d) => { 
            setAutoData(d); 
            setPhase(ScoutingPhase.TELEOP); 
            syncScoutData('AUTO_COMPLETE', d, null, user);
          }} 
          onBack={() => setPhase(ScoutingPhase.AUTH)}
          onLogout={handleLogout}
          initialData={autoData || {
            matchNumber: user?.matchNumber || '1',
            teamScouted: user?.teamScouted || '',
            isZoneSmall: false, isZoneBig: false, leave: false,
            cycles: [
              { id: 'Preload', collected: true, count: 0, missCount: 0 },
              { id: '1', collected: false, count: 0, missCount: 0 },
              { id: '2', collected: false, count: 0, missCount: 0 },
              { id: '3', collected: false, count: 0, missCount: 0 },
            ],
            openGate: false, intake: false, ballsSide: 0, ballsMissed: 0, freeText: ''
          }} 
        />;
      case ScoutingPhase.TELEOP: 
        return <TeleOpBinding 
          language={language}
          onNext={(d) => { 
            setTeleopData(d); 
            setPhase(ScoutingPhase.SUMMARY); 
            syncScoutData('TELEOP_COMPLETE', autoData, d, user);
          }} 
          onBack={() => setPhase(ScoutingPhase.AUTONOMOUS)} 
          onLogout={handleLogout}
          initialData={teleopData || undefined} 
        />;
      case ScoutingPhase.SUMMARY: 
        return <SummaryBinding 
          language={language}
          auto={autoData!} 
          teleop={teleopData!} 
          user={user!}
          targetSheetId=""
          error={summaryError}
          isSyncing={syncStatus === 'syncing'}
          onDeleteGame={handleDeleteGame}
          onUpdateMetadata={handleUpdateMetadata}
          onLogout={handleLogout}
          onBack={() => setPhase(ScoutingPhase.TELEOP)}
          isSubmitting={isSubmitting}
          onFinish={async (data) => {
            if (isSubmitting) return;
            setIsSubmitting(true);
            setSummaryError(null);
            // Final duplicate check before sync
            setIsFetchingHistory(true);
            try {
              const cacheBuster = Date.now();
              const response = await fetch(`/api/history?sheetName=${SHEET_NAME}&_=${cacheBuster}`);
              if (response.ok) {
                const text = await response.text();
                const result = JSON.parse(text);
                const latestHistory = Array.isArray(result) ? result : (result.data && Array.isArray(result.data) ? result.data : []);
                setHistory(latestHistory);

                const team = autoData?.teamScouted || user?.teamScouted || '';
                const match = autoData?.matchNumber || user?.matchNumber || '';
                const name = user?.name || '';

                const restriction = checkScoutingRestrictions(latestHistory, team, match, name);
                if (restriction) {
                  const authT: any = language === Language.HE ? AuthTranslation_HE : AuthTranslation_EN;
                  let errorMsg = '';
                  if (restriction === 'TEAM_EXISTS') {
                    errorMsg = authT.teamExistsError.replace('{team}', team).replace('{match}', match);
                  } else if (restriction === 'MATCH_FULL') {
                    errorMsg = authT.matchLimitError.replace('{match}', match);
                  } else {
                    errorMsg = authT.duplicateError.replace('{team}', team).replace('{match}', match).replace('{name}', name);
                  }
                  setSummaryError(errorMsg);
                  return;
                }
              }
            } catch (e) {
              console.error('Final duplicate check failed:', e);
            } finally {
              setIsFetchingHistory(false);
            }

            await syncScoutData('MATCH_COMPLETE', autoData, teleopData, user, data.aiAnalysis);
            if (user) {
              setLastName(user.name);
              const currentMatch = parseInt(user.matchNumber);
              setLastMatchNumber(isNaN(currentMatch) ? user.matchNumber : (currentMatch + 1).toString());
            }
            setUser(null); setAutoData(null); setTeleopData(null); setPhase(ScoutingPhase.AUTH);
            setSummaryError(null);
            setIsSubmitting(false);
          }} 
        />;
      case ScoutingPhase.ADMIN:
        return <AdminBinding 
          language={language}
          history={history}
          isLoading={isFetchingHistory}
          sheetName={SHEET_NAME}
          spreadsheetId=""
          onBack={() => setPhase(ScoutingPhase.AUTH)}
          onLogout={handleLogout}
          isSeeding={seedStatus === 'loading'}
          isRecalculating={recalcStatus === 'loading'}
          lastConsolidationTime={lastConsolidationTime}
          autoCalcActive={settings.isAutoCalcActive}
          autoCalcSeconds={settings.calcIntervalSeconds}
          onSeed={handleSeedData}
          onRecalculate={handleRecalculate}
          onUpdateSettings={handleUpdateSettings}
          teamsGrades={teamsGrades}
          isLoadingGrades={isLoadingGrades}
          onFetchGrades={fetchTeamsGrades}
        />;
      case ScoutingPhase.MANAGEMENT:
        const isRTL = language === Language.HE;
        const getButtonClass = (status: 'idle' | 'loading' | 'success' | 'error') => {
          if (status === 'loading') return 'bg-emerald-500 text-white cursor-not-allowed';
          if (status === 'error') return 'bg-red-500 text-white';
          if (status === 'success') return 'bg-purple-600 text-white';
          return 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg active:scale-[0.98]';
        };

        return (
          <div className="max-w-6xl mx-auto p-4 sm:p-8 bg-white rounded-[2rem] shadow-2xl border border-slate-200 min-h-[500px] flex flex-col relative overflow-hidden">
            <button 
              onClick={() => setPhase(ScoutingPhase.AUTH)}
              className="absolute top-6 left-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10"
            >
              <ArrowLeft size={24} />
            </button>
            <button 
              onClick={handleLogout}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-10 pt-4">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">MANAGEMENT PANEL</h2>
              <p className="text-slate-500 font-medium">System initialization and data management</p>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4 items-stretch">
              {/* Seed Data Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                  <TableIcon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{isRTL ? 'יצירת נתוני דוגמה' : 'Generate Sample Data'}</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isRTL ? 'צור רשומות משחקים פיקטיביות למטרות בדיקה.' : 'Generate dummy match records for testing purposes.'}
                </p>
                {seedStatus === 'loading' && (
                  <p className="text-[10px] text-indigo-600 font-black mb-4 animate-pulse uppercase tracking-widest">
                    {isRTL ? 'מעבד נתונים... אנא המתן' : 'Processing... Please wait'}
                  </p>
                )}
                {seedStatus === 'error' && seedError && (
                  <p className="text-[10px] text-red-500 font-bold mb-4 line-clamp-2">{seedError}</p>
                )}
                <button
                  onClick={() => {
                    console.log('Seed button clicked - showing confirm');
                    setShowSeedConfirm(true);
                  }}
                  disabled={seedStatus === 'loading'}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto ${getButtonClass(seedStatus)}`}
                >
                  {seedStatus === 'loading' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : (isRTL ? 'צור נתוני דוגמה' : 'Generate Samples')}
                </button>
              </div>

              {/* Consolidate Data Card */}
              <div id="mgt-consolidate-card" className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                  <RefreshCw size={24} />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-slate-800">{isRTL ? 'גיבוש נתונים' : 'Consolidate Data'}</h3>
                  {lastConsolidationTime && (
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse">
                      {isRTL ? 'עודכן:' : 'Last updated:'} {lastConsolidationTime}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  {isRTL ? 'חשב מחדש את כל ציוני הקבוצות מנתוני המשחקים הגולמיים.' : 'Recalculate all team grades from raw match data.'}
                </p>
                {recalcStatus === 'error' && recalcError && (
                  <p className="text-[10px] text-red-500 font-bold mb-4 line-clamp-2">{recalcError}</p>
                )}
                <button
                  id="btn-mgt-consolidate"
                  onClick={handleRecalculate}
                  disabled={recalcStatus === 'loading'}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto ${getButtonClass(recalcStatus)}`}
                >
                  {recalcStatus === 'loading' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Recalculating...</> : (isRTL ? 'רענן וגבש נתונים' : 'Consolidate Now')}
                </button>
              </div>

              {/* Grades Config Card */}
              <div id="mgt-grades-config-card" className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mb-4">
                  <Sliders size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {isRTL ? 'הגדרות חישוב' : 'Grades Config'}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isRTL 
                    ? 'קבע את משקלי הפרמטרים השונים לצורך דירוג וציוני הקבוצות.' 
                    : 'Configure scoring weights used in the grading system calculation.'}
                </p>
                <button
                  id="btn-mgt-grades-config"
                  onClick={() => {
                    setIsWeightsModalOpen(true);
                    fetchWeights();
                  }}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto bg-purple-600 hover:bg-purple-700 text-white shadow-lg active:scale-[0.98]"
                >
                  <Sliders size={14} />
                  {isRTL ? 'עדכן הגדרות' : 'Configure Weights'}
                </button>
              </div>
            </div>
          </div>
        );
      default: 
        return <AuthBinding 
          onSubmit={handleAuthSubmit} 
          language={language} 
          initialName={lastName}
          initialMatchNumber={lastMatchNumber}
          history={history}
        />;
    }
  };

  if (isSystemPaused) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
            <Radio size={40} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            {language === Language.HE ? 'המערכת מושבתת זמנית' : 'System Temporarily Paused'}
          </h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            {language === Language.HE 
              ? 'המערכת כבויה כרגע בהתאם לבקשת המשתמש. נא להמתין לעדכון נוסף.' 
              : 'The application is currently shut down per user request. Please wait for further updates.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-mono">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <span>Maintenance Mode</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {showSeedConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-md w-full border border-slate-100"
          >
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-6 mx-auto">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 text-center uppercase tracking-tight">
              {language === Language.HE ? 'אישור יצירת נתונים' : 'Confirm Data Seeding'}
            </h2>
            <p className="text-slate-500 font-medium text-center leading-relaxed mb-8">
              {language === Language.HE 
                ? 'פעולה זו תמחק את כל הלוגים, הדוחות והציונים הקיימים ותייצר רשומות דמה חדשות עבור 6 קבוצות ב-10 מקצים. האם אתה בטוח?' 
                : 'This will delete all current logs, reports, and grades, and generate new dummy records for 6 teams across 10 matches. Are you sure?'}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowSeedConfirm(false)}
                className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                {language === Language.HE ? 'ביטול' : 'Cancel'}
              </button>
              <button 
                onClick={handleSeedData}
                className="py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-200 hover:shadow-none transition-all"
              >
                {language === Language.HE ? 'אשר וצור' : 'Confirm & Generate'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {seedStatus === 'loading' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 text-center"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full border border-white/20 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                <Database size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">
              {language === Language.HE ? 'יוצר נתוני דמו' : 'Seeding Data'}
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              {language === Language.HE 
                ? 'המערכת מייצרת כרגע נתוני דוגמה ומסנכרנת את בסיס הנתונים. אנא המתן לסיום הפעולה.' 
                : 'Generating match records and synchronizing database. Please wait until the process completes.'}
            </p>
            <div className="mt-8 flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 bg-indigo-600 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {isWeightsModalOpen && (
        <div id="weights-modal-overlay" className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border-2 border-slate-900 p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative text-slate-700"
            dir={language === Language.HE ? 'rtl' : 'ltr'}
          >
            {/* Close Button */}
            <button 
              id="btn-close-weights-modal"
              onClick={() => setIsWeightsModalOpen(false)}
              className={`absolute top-6 ${language === Language.HE ? 'left-6' : 'right-6'} p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10`}
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase text-purple-600 tracking-widest">
                {language === Language.HE ? 'הגדרות מתקדמות עבור ניהול מערכת' : 'Advanced System Admin Configuration'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mt-1">
                <Sliders className="text-purple-600" />
                {language === Language.HE ? 'הגדרות חישוב ציונים קבוצתיים' : 'Overall Grading Weights'}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {language === Language.HE 
                  ? 'כוון את משקלי הפרמטרים השונים. השמירה תעדכן ותחשב מחדש את ציוני כל הקבוצות בענן!' 
                  : 'Adjust relative parameters weights. Saving will store values and instantly recalculate all database values.'}
              </p>
            </div>

            {/* Grid layout inside the modal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              
              {/* Left Column: Form/Sliders */}
              <div className="space-y-5 border-b lg:border-b-0 lg:border-e border-slate-200 pb-6 lg:pb-0 lg:pe-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 text-sm">
                    {language === Language.HE ? 'משקלי פרמטרים' : 'Relative Parameter Weights'}
                  </h3>
                  <button
                    id="btn-toggle-weights-help"
                    onClick={() => setShowWeightsHelp(!showWeightsHelp)}
                    className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    <HelpCircle size={14} />
                    {language === Language.HE ? 'עזרה והסברים' : 'Help & Methodology'}
                  </button>
                </div>

                {showWeightsHelp && (
                  <div className="bg-purple-50 border border-purple-150 p-4 rounded-2xl text-xs space-y-2 text-purple-950 animate-in fade-in duration-200">
                    <p className="font-bold">
                      {language === Language.HE ? 'נוסחת החישוב היסודית:' : 'Primary Mathematical Formula:'}
                    </p>
                    <code className="block bg-white/60 p-2 rounded font-mono text-[10px] text-center">
                      Grade = (AvgAutoHit × WEIGHT_AUTOHIT) + (AvgTeleHit × WEIGHT_TELEHIT) + (AvgPark × WEIGHT_PARK) + (AvgAutoMiss × WEIGHT_AUTOMISS) + (AvgTeleMiss × WEIGHT_TELEMISS) + (AvgFouls × WEIGHT_FAUL)
                    </code>
                    <p className="leading-relaxed">
                      {language === Language.HE 
                        ? 'ערכי הפגיעות החיוביות מוסיפים לציון הקבוצה, בעוד משקלי ההחטאות (Miss) והעבירות (Fouls) מתפקדים כקנסות המורידים מהציון המצטבר של הקבוצה.' 
                        : 'Positive weights reward hits, while negative weights penalize misses and active fouls.'}
                    </p>
                  </div>
                )}

                {/* Slider: Auto Hit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'פגיעות אוטונומי (POINTS_AUTO_HIT)' : 'Auto Hits Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_AUTO_HIT}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_AUTO_HIT}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Slider: Tele Hit */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'פגיעות טלאופ (POINTS_TELEOP_HIT)' : 'Teleop Hits Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_TELEOP_HIT}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_TELEOP_HIT}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Slider: Parking */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'חנייה (POINTS_PARKING)' : 'Parking Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_PARKING}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_PARKING}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Slider: Auto Miss */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'החטאות אוטונומי (POINTS_AUTO_MISS)' : 'Auto Miss Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_AUTO_MISS}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_AUTO_MISS}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Slider: Tele Miss */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'החטאות טלאופ (POINTS_TELEOP_MISS)' : 'Teleop Miss Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_TELEOP_MISS}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_TELEOP_MISS}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                {/* Slider: Fouls */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>{language === Language.HE ? 'עבירות (POINTS_FAUL)' : 'Fouls Weight'}</span>
                    <input 
                      type="number" 
                      min="-100" 
                      max="100" 
                      value={sliderWeights.POINTS_FAUL}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                      className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                    />
                  </div>
                  <input 
                    type="range" 
                    min="-100" 
                    max="100" 
                    value={sliderWeights.POINTS_FAUL}
                    onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* Right Column: Simulated Live Rankings Outputs */}
              <div className="flex flex-col h-full justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-3">
                    {language === Language.HE ? 'תצוגת סימולציית ציונים ודירוגים' : 'Simulated Ranking Outcomes'}
                  </h3>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {simulatedTeams.length === 0 ? (
                      <p className="text-slate-400 text-xs italic text-center py-6">
                        {language === Language.HE ? 'אין נתוני קבוצות לסימולציה כרגע' : 'No team grades discovered yet to run simulation.'}
                      </p>
                    ) : (
                      simulatedTeams.map((sim: any) => {
                        const actualGrade = teamsGrades.find(t => t.TeamNumber === sim.TeamNumber);
                        const diffGrade = actualGrade ? (sim.SIMULATED_GRADE - actualGrade.GRADE) : 0;
                        const diffRank = actualGrade ? (actualGrade.RANK - sim.SIMULATED_RANK) : 0;

                        return (
                          <div 
                            key={sim.TeamNumber} 
                            className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-3 transition-all flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-black">
                                {sim.SIMULATED_RANK}
                              </span>
                              <span className="text-xs font-black text-slate-900">
                                {language === Language.HE ? 'קבוצה' : 'Team'} {sim.TeamNumber}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-sm font-black text-purple-600 font-mono">
                                  {sim.SIMULATED_GRADE}
                                </span>
                              </div>

                              <div className="text-[10px] text-slate-400 font-bold border-s border-slate-200 ps-3">
                                {actualGrade && (
                                  <div className="flex flex-col items-end">
                                    <span className="font-mono text-[9px] text-slate-400">
                                      {language === Language.HE ? 'קודם: ' : 'Prev: '} 
                                      <span className="font-black text-slate-600">{actualGrade.GRADE}</span>
                                    </span>
                                    {diffGrade !== 0 && (
                                      <span className={`font-mono font-black text-[9px] ${diffGrade > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {diffGrade > 0 ? `+${diffGrade.toFixed(1)}` : diffGrade.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Confirm / Save Actions in right column footer */}
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-150 justify-end w-full">
                  <button
                    id="btn-cancel-weights"
                    onClick={() => setIsWeightsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all"
                  >
                    {language === Language.HE ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    id="btn-save-weights"
                    onClick={handleSaveWeights}
                    disabled={isSavingWeights}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-lg shadow-purple-100 transition-all flex items-center gap-1.5"
                  >
                    {isSavingWeights ? (language === Language.HE ? 'שומר...' : 'Saving...') : (language === Language.HE ? 'שמור משקלים' : 'Save Config')}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
      <Layout 
        user={user} 
        onLogout={handleLogout}
        language={language}
        onLanguageToggle={() => setLanguage(l => l === Language.HE ? Language.EN : Language.HE)}
        isNavExpanded={isNavExpanded}
        onToggleNav={() => setIsNavExpanded(!isNavExpanded)}
        onLogoClick={() => setPhase(ScoutingPhase.AUTH)}
      >
        <div className="max-w-4xl mx-auto px-2 py-4 sm:px-4 sm:py-6" dir={language === Language.HE ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-3xl shadow-2xl p-6">
            {renderPhase()}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default App;