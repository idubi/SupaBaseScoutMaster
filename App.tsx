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
  HelpCircle,
  Search,
  Trash2,
  Check,
  Users,
  UserPlus,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Target
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
    POINTS_FAUL: 0, // General fallback

    // Fine-grained fouls
    POINTS_FOUL_GATE: -2,
    POINTS_FOUL_PARKING: -2,
    POINTS_FOUL_INTAKE: -2,

    // New Weights
    POINTS_OPEN_GATE: 2,
    POINTS_INTAKE_USED: 2,
    POINTS_AUTO_LEAVE: 2,
    POINTS_SHOOTING_SMALL: 2,
    POINTS_SHOOTING_BIG: 2,
    POINTS_COLLECTION_HUMAN: 2,
    POINTS_COLLECTION_FLOOR: 2,
    POINTS_DRIVER_AWARENESS: 3,
    POINTS_DRIVER_SUCCESS: 3,
    POINTS_DRIVER_REBOUND: 2,
    POINTS_DRIVER_LATE: -1,
    POINTS_DRIVER_FROZEN: -3,
    POINTS_DRIVER_CONFUSED: -2,
    POINTS_DRIVER_STOPPED: -3
  });
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [showWeightsHelp, setShowWeightsHelp] = useState(false);
  const [activeWeightsCategory, setActiveWeightsCategory] = useState<string | null>('core');

  // Deletion Management states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [delMode, setDelMode] = useState<'full' | 'selected' | 'game'>('selected');
  const [delSelectedTeams, setDelSelectedTeams] = useState<string[]>([]);
  const [delSelectedGames, setDelSelectedGames] = useState<string[]>([]);
  const [delSearchTerm, setDelSearchTerm] = useState('');
  const [delGameSearchTerm, setDelGameSearchTerm] = useState('');
  const [delStatus, setDelStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [delError, setDelError] = useState<string | null>(null);
  const [delConfirmOpen, setDelConfirmOpen] = useState(false);
  const [delConfirmInput, setDelConfirmInput] = useState('');
  const [serverUniqueTeams, setServerUniqueTeams] = useState<string[]>([]);

  // User Management states
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [usersList, setUsersList] = useState<Array<{ name: string; password: string; roles: string[] }>>([]);
  const [mgmtUserName, setMgmtUserName] = useState('');
  const [mgmtUserPassword, setMgmtUserPassword] = useState('');
  const [mgmtSelectedRoles, setMgmtSelectedRoles] = useState<string[]>([]);
  const [mgmtStatus, setMgmtStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mgmtError, setMgmtError] = useState<string | null>(null);
  const [mgmtSearchTerm, setMgmtSearchTerm] = useState('');
  const [mgmtEditingUser, setMgmtEditingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.users)) {
          setUsersList(data.users);
        }
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgmtUserName.trim() || !mgmtUserPassword.trim() || mgmtSelectedRoles.length === 0) {
      setMgmtError(language === Language.HE ? 'נא למלא את כל השדות ולבחור לפחות תפקיד אחד' : 'Please check all inputs and select at least one role');
      setMgmtStatus('error');
      return;
    }

    setMgmtStatus('loading');
    setMgmtError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: mgmtUserName.trim(),
          password: mgmtUserPassword.trim(),
          roles: mgmtSelectedRoles
        })
      });

      if (response.ok) {
        setMgmtStatus('success');
        setMgmtUserName('');
        setMgmtUserPassword('');
        setMgmtSelectedRoles([]);
        setMgmtEditingUser(null);
        await fetchUsers();
        // Reset success state after 2 seconds
        setTimeout(() => setMgmtStatus('idle'), 2000);
      } else {
        const data = await response.json();
        setMgmtError(data.error || 'Failed to save user');
        setMgmtStatus('error');
      }
    } catch (err: any) {
      setMgmtError(err.message || 'Error occurred');
      setMgmtStatus('error');
    }
  };

  const handleDeleteUser = async (userName: string) => {
    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: userName })
      });

      if (response.ok) {
        if (mgmtEditingUser === userName) {
          setMgmtEditingUser(null);
          setMgmtUserName('');
          setMgmtUserPassword('');
          setMgmtSelectedRoles([]);
        }
        await fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  const handleEditUserClick = (usr: { name: string; password: string; roles: string[] }) => {
    setMgmtEditingUser(usr.name);
    setMgmtUserName(usr.name);
    setMgmtUserPassword(usr.password);
    setMgmtSelectedRoles(usr.roles);
    setMgmtError(null);
    setMgmtStatus('idle');
  };

  const fetchUniqueTeamsForDelete = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setServerUniqueTeams(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch distinct teams:", err);
    }
  };

  const handleCommitDelete = async () => {
    setDelStatus('loading');
    setDelError(null);

    try {
      const payload = {
        mode: delMode,
        selectedTeams: delMode === 'selected' ? delSelectedTeams : undefined,
        selectedGames: delMode === 'game' ? delSelectedGames : undefined
      };

      const res = await fetch('/api/admin/delete-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.error || 'Server returned an error status');
      }

      await res.json();
      setDelStatus('success');
      setDelSelectedTeams([]);
      setDelSelectedGames([]);

      // Recalculate grades after deletion to refresh DB scores
      await handleRecalculate();
      await fetchTeamsGrades();
      await fetchHistory();

      // Hide success toast after 4 seconds
      setTimeout(() => {
        setDelStatus('idle');
      }, 4000);

    } catch (err: any) {
      console.error("Delete error:", err);
      setDelStatus('error');
      setDelError(err.message || 'An unexpected error occurred during delete');
    }
  };

  const uniqueTeams = React.useMemo(() => {
    if (serverUniqueTeams.length > 0) {
      return serverUniqueTeams;
    }

    const historyTeams = history
      .map(row => row.teamScouted?.toString().trim())
      .filter((team): team is string => !!team && team !== '');
    
    const gradesTeams = (teamsGrades || [])
      .map(team => team.TeamNumber?.toString().trim())
      .filter((team): team is string => !!team && team !== '');

    const combinedTeams = Array.from(new Set([...historyTeams, ...gradesTeams]));
    
    return combinedTeams.sort((a: string, b: string) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [history, teamsGrades, serverUniqueTeams]);

  const uniqueMatches = React.useMemo(() => {
    const list = history
      .map(row => (row.matchNumber || row.gameNumber || '').toString().trim())
      .filter((match): match is string => !!match && match !== '');
    const combined = Array.from(new Set(list));
    return combined.sort((a: string, b: string) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (isNaN(numA) || isNaN(numB)) return a.localeCompare(b);
      return numA - numB;
    });
  }, [history]);

  const fetchWeights = async () => {
    try {
      const res = await fetch('/api/grading-config');
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.config) {
          setSliderWeights({
            POINTS_AUTO_HIT: Number(body.config.POINTS_AUTO_HIT ?? 7),
            POINTS_TELEOP_HIT: Number(body.config.POINTS_TELEOP_HIT ?? 5),
            POINTS_PARKING: Number(body.config.POINTS_PARKING ?? 5),
            POINTS_AUTO_MISS: Number(body.config.POINTS_AUTO_MISS ?? -1),
            POINTS_TELEOP_MISS: Number(body.config.POINTS_TELEOP_MISS ?? -1),
            POINTS_FAUL: Number(body.config.POINTS_FAUL ?? 0),
            POINTS_FOUL_GATE: Number(body.config.POINTS_FOUL_GATE ?? -2),
            POINTS_FOUL_PARKING: Number(body.config.POINTS_FOUL_PARKING ?? -2),
            POINTS_FOUL_INTAKE: Number(body.config.POINTS_FOUL_INTAKE ?? -2),
            POINTS_OPEN_GATE: Number(body.config.POINTS_OPEN_GATE ?? 2),
            POINTS_INTAKE_USED: Number(body.config.POINTS_INTAKE_USED ?? 2),
            POINTS_AUTO_LEAVE: Number(body.config.POINTS_AUTO_LEAVE ?? 2),
            POINTS_SHOOTING_SMALL: Number(body.config.POINTS_SHOOTING_SMALL ?? 2),
            POINTS_SHOOTING_BIG: Number(body.config.POINTS_SHOOTING_BIG ?? 2),
            POINTS_COLLECTION_HUMAN: Number(body.config.POINTS_COLLECTION_HUMAN ?? 2),
            POINTS_COLLECTION_FLOOR: Number(body.config.POINTS_COLLECTION_FLOOR ?? 2),
            POINTS_DRIVER_AWARENESS: Number(body.config.POINTS_DRIVER_AWARENESS ?? 3),
            POINTS_DRIVER_SUCCESS: Number(body.config.POINTS_DRIVER_SUCCESS ?? 3),
            POINTS_DRIVER_REBOUND: Number(body.config.POINTS_DRIVER_REBOUND ?? 2),
            POINTS_DRIVER_LATE: Number(body.config.POINTS_DRIVER_LATE ?? -1),
            POINTS_DRIVER_FROZEN: Number(body.config.POINTS_DRIVER_FROZEN ?? -3),
            POINTS_DRIVER_CONFUSED: Number(body.config.POINTS_DRIVER_CONFUSED ?? -2),
            POINTS_DRIVER_STOPPED: Number(body.config.POINTS_DRIVER_STOPPED ?? -3)
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
        RANK: Number(team.RANK || 1),

        // Map newly tracked variables for frontend dynamic slider calculation
        TOTAL_OPEN_GATE: Number(team.TOTAL_OPEN_GATE || 0),
        TOTAL_INTAKE_USED: Number(team.TOTAL_INTAKE_USED || 0),
        TOTAL_SHOOTING_SMALL: Number(team.TOTAL_SHOOTING_SMALL || 0),
        TOTAL_SHOOTING_BIG: Number(team.TOTAL_SHOOTING_BIG || 0),
        TOTAL_COLLECTION_HUMAN: Number(team.TOTAL_COLLECTION_HUMAN || 0),
        TOTAL_COLLECTION_FLOOR: Number(team.TOTAL_COLLECTION_FLOOR || 0),
        TOTAL_DRIVER_AWARENESS: Number(team.TOTAL_DRIVER_AWARENESS || 0),
        TOTAL_DRIVER_SUCCESS: Number(team.TOTAL_DRIVER_SUCCESS || 0),
        TOTAL_DRIVER_REBOUND: Number(team.TOTAL_DRIVER_REBOUND || 0),
        TOTAL_DRIVER_LATE: Number(team.TOTAL_DRIVER_LATE || 0),
        TOTAL_DRIVER_FROZEN: Number(team.TOTAL_DRIVER_FROZEN || 0),
        TOTAL_DRIVER_CONFUSED: Number(team.TOTAL_DRIVER_CONFUSED || 0),
        TOTAL_DRIVER_STOPPED: Number(team.TOTAL_DRIVER_STOPPED || 0),
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

  const checkScoutingRestrictions = (historyData: SpreadsheetRow[], team: string, match: string, scouterName: string): 'TEAM_EXISTS' | 'MATCH_FULL' | 'DUPLICATE_REPORT' | null => {
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

    // 2. Check if this specific scouter already scouted this match/team
    const scouterAlreadyScouted = historyData.some(row => {
      const rowTeam = String(row.teamScouted || '').trim();
      const rowMatch = String(row.matchNumber || '').trim();
      const rowName = String(row.name || '').trim().toLowerCase();
      const rowRecordType = row['recordType'];
      return rowRecordType === 'MATCH_COMPLETE' && rowTeam === cleanTeam && rowMatch === cleanMatch && rowName === cleanName;
    });
    
    if (scouterAlreadyScouted) return 'DUPLICATE_REPORT';

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

              {/* Delete Statistics Card */}
              <div id="mgt-delete-stats-card" className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {isRTL ? 'מחיקת סטטיסטיקות' : 'Delete Statistics'}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isRTL 
                    ? 'מחק לצמיתות נתוני משחקים או ציוני קבוצות מסוימות.' 
                    : 'Permanently delete match records or specific team statistics.'}
                </p>
                <button
                  id="btn-mgt-delete-stats"
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    fetchUniqueTeamsForDelete();
                    fetchHistory();
                  }}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-[0.98]"
                >
                  <Trash2 size={14} />
                  {isRTL ? 'ניהול מחיקה' : 'Manage Deletes'}
                </button>
              </div>

              {/* Users/Managers Management Card */}
              <div id="mgt-users-card" className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  {isRTL ? 'ניהול משתמשים' : 'User Management'}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isRTL 
                    ? 'הוסף, שנה סיסמאות או מחק משתמשים ומנהלים במערכת.' 
                    : 'Manage active system users, scouters, administrators and setup passwords.'}
                </p>
                <button
                  id="btn-mgt-users"
                  onClick={() => {
                    setIsUsersModalOpen(true);
                    fetchUsers();
                  }}
                  className="w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg active:scale-[0.98]"
                >
                  <Users size={14} />
                  {isRTL ? 'ניהול משתמשים' : 'Manage Users'}
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
              <div className="flex flex-col border-b lg:border-b-0 lg:border-e border-slate-200 pb-6 lg:pb-0 lg:pe-8 h-[650px]">
                <div className="flex items-center justify-between mb-2 shrink-0">
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
                  <div className="bg-purple-50 border border-purple-150 p-4 rounded-2xl text-xs space-y-2 text-purple-950 animate-in fade-in duration-200 shrink-0 mb-4">
                    <p className="font-bold">
                      {language === Language.HE 
                        ? 'נוסחת החישוב היסודית משלבת את כל המשתנים השונים לפי המשקלים שבחרתם.' 
                        : 'The base calculation formula integrates all variables according to selected weights.'}
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                  {/* Section: Autonomous Category */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeightsCategory(activeWeightsCategory === 'auto' ? null : 'auto')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all select-none text-right ${
                        activeWeightsCategory === 'auto' 
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/85 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${activeWeightsCategory === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/60 text-slate-500'}`}>
                          <Sliders size={14} />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black uppercase tracking-tight">
                            {language === Language.HE ? '1. אוטונומי (Auto)' : '1. Autonomous (Auto)'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {language === Language.HE ? '7 משתני ביצועים באוטונומי' : '7 autonomous performance variables'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          size={15} 
                          className={`transition-all duration-300 ${
                            activeWeightsCategory === 'auto' ? 'rotate-90 text-purple-600' : 'text-slate-400'
                          }`} 
                        />
                      </div>
                    </button>

                    {activeWeightsCategory === 'auto' && (
                      <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-4 shadow-inner-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* 1.1 Leave */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '1.1 עזיבת אזור (POINTS_AUTO_LEAVE)' : '1.1 Leave (POINTS_AUTO_LEAVE)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_AUTO_LEAVE}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_LEAVE: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_AUTO_LEAVE}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_LEAVE: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 1.2 Intake */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '1.2 ביצוע אינטייק (POINTS_INTAKE_USED)' : '1.2 Intake (POINTS_INTAKE_USED)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_INTAKE_USED}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_INTAKE_USED: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_INTAKE_USED}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_INTAKE_USED: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 1.3 Open Gate */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '1.3 פתיחת שער (POINTS_OPEN_GATE)' : '1.3 Open Gate (POINTS_OPEN_GATE)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_OPEN_GATE}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_OPEN_GATE: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_OPEN_GATE}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_OPEN_GATE: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 1.4 Hit */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '1.4 פגיעות (POINTS_AUTO_HIT)' : '1.4 Hit (POINTS_AUTO_HIT)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_AUTO_HIT}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_AUTO_HIT}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 1.5 Miss */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '1.5 החטאות (POINTS_AUTO_MISS)' : '1.5 Miss (POINTS_AUTO_MISS)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_AUTO_MISS}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_AUTO_MISS}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Optional Zone Info kept is beautiful */}
                        <div className="space-y-1.5 border-t border-dashed border-slate-150 pt-2.5">
                          <label className="text-[10px] uppercase font-bold text-purple-600 select-none">קליעה באילוץ אזור / Zone-Restricted Hits</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Auto Small */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                                <span>אזור קטן / Small</span>
                                <input 
                                  type="number" min="-100" max="100" 
                                  value={sliderWeights.POINTS_SHOOTING_SMALL}
                                  onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_SHOOTING_SMALL: Number(e.target.value) })}
                                  className="w-10 text-center py-0.5 border border-slate-300 rounded font-mono font-bold text-[10px]"
                                />
                              </div>
                              <input 
                                type="range" min="-100" max="100" dir="ltr"
                                value={sliderWeights.POINTS_SHOOTING_SMALL}
                                onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_SHOOTING_SMALL: Number(e.target.value) })}
                                className="w-full h-1 bg-slate-100 rounded appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>
                            {/* Auto Big */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                                <span>אזור גדול / Big</span>
                                <input 
                                  type="number" min="-100" max="100" 
                                  value={sliderWeights.POINTS_SHOOTING_BIG}
                                  onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_SHOOTING_BIG: Number(e.target.value) })}
                                  className="w-10 text-center py-0.5 border border-slate-300 rounded font-mono font-bold text-[10px]"
                                />
                              </div>
                              <input 
                                type="range" min="-100" max="100" dir="ltr"
                                value={sliderWeights.POINTS_SHOOTING_BIG}
                                onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_SHOOTING_BIG: Number(e.target.value) })}
                                className="w-full h-1 bg-slate-100 rounded appearance-none cursor-pointer accent-purple-600"
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Section: 2.1 Teleop Intake Category */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeightsCategory(activeWeightsCategory === 'teleop_intake' ? null : 'teleop_intake')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all select-none text-right ${
                        activeWeightsCategory === 'teleop_intake' 
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/85 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${activeWeightsCategory === 'teleop_intake' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/60 text-slate-500'}`}>
                          <ClipboardList size={14} />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black uppercase tracking-tight">
                            {language === Language.HE ? '2.1 איסוף בטלאופ (Teleop Intake)' : '2.1 Teleop Intake'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {language === Language.HE ? '2 משתני יכולות איסוף' : '2 collection variables'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          size={15} 
                          className={`transition-all duration-300 ${
                            activeWeightsCategory === 'teleop_intake' ? 'rotate-90 text-purple-600' : 'text-slate-400'
                          }`} 
                        />
                      </div>
                    </button>

                    {activeWeightsCategory === 'teleop_intake' && (
                      <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-4 shadow-inner-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* 2.1.1 Floor Collection */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '2.1.1 איסוף מהרצפה (POINTS_COLLECTION_FLOOR)' : '2.1.1 Floor Intake (POINTS_COLLECTION_FLOOR)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_COLLECTION_FLOOR}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_COLLECTION_FLOOR: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_COLLECTION_FLOOR}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_COLLECTION_FLOOR: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 2.1.2 Human Player Collection */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '2.1.2 איסוף שחקן אנושי (POINTS_COLLECTION_HUMAN)' : '2.1.2 Human Intake (POINTS_COLLECTION_HUMAN)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_COLLECTION_HUMAN}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_COLLECTION_HUMAN: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_COLLECTION_HUMAN}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_COLLECTION_HUMAN: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: 2.2 Teleop Shooting Category */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeightsCategory(activeWeightsCategory === 'teleop_shooting' ? null : 'teleop_shooting')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all select-none text-right ${
                        activeWeightsCategory === 'teleop_shooting' 
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/85 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${activeWeightsCategory === 'teleop_shooting' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/60 text-slate-500'}`}>
                          <Target size={14} />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black uppercase tracking-tight">
                            {language === Language.HE ? '2.2 קליעה בטלאופ (Teleop Shooting)' : '2.2 Teleop Shooting'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {language === Language.HE ? '2 משתני פגיעה/החטאה בטלאופ' : '2 teleop shooting hits/misses'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          size={15} 
                          className={`transition-all duration-300 ${
                            activeWeightsCategory === 'teleop_shooting' ? 'rotate-90 text-purple-600' : 'text-slate-400'
                          }`} 
                        />
                      </div>
                    </button>

                    {activeWeightsCategory === 'teleop_shooting' && (
                      <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-4 shadow-inner-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* 2.2.1 Teleop Hit */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '2.2.1 פגיעות טלאופ (POINTS_TELEOP_HIT)' : '2.2.1 Tele Hit (POINTS_TELEOP_HIT)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_TELEOP_HIT}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_TELEOP_HIT}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* 2.2.2 Teleop Miss */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? '2.2.2 החטאות טלאופ (POINTS_TELEOP_MISS)' : '2.2.2 Tele Miss (POINTS_TELEOP_MISS)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_TELEOP_MISS}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_TELEOP_MISS}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: 2.3 Driver Skills Category */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeightsCategory(activeWeightsCategory === 'driver' ? null : 'driver')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all select-none text-right ${
                        activeWeightsCategory === 'driver' 
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/85 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${activeWeightsCategory === 'driver' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200/60 text-slate-500'}`}>
                          <Users size={14} />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black uppercase tracking-tight">
                            {language === Language.HE ? '2.3 מיומנות נהג וחנייה (Driver Skills)' : '2.3 Driver Skills & Parking'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {language === Language.HE ? '9 משתני ביצועי נהיגה וחנייה' : '9 driving & parking variables'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          size={15} 
                          className={`transition-all duration-300 ${
                            activeWeightsCategory === 'driver' ? 'rotate-90 text-purple-600' : 'text-slate-400'
                          }`} 
                        />
                      </div>
                    </button>

                    {activeWeightsCategory === 'driver' && (
                      <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-4 shadow-inner-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Parking */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'חנייה (POINTS_PARKING)' : 'Parking Weight (POINTS_PARKING)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_PARKING}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_PARKING}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Awareness */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'מודעות שטח (POINTS_DRIVER_AWARENESS)' : 'Field Awareness (POINTS_DRIVER_AWARENESS)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_AWARENESS}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_AWARENESS: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_AWARENESS}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_AWARENESS: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Success */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'הצלחה כללית (POINTS_DRIVER_SUCCESS)' : 'Overall Success (POINTS_DRIVER_SUCCESS)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_SUCCESS}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_SUCCESS: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_SUCCESS}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_SUCCESS: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Rebound */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'כדור חוזר מהיר (POINTS_DRIVER_REBOUND)' : 'Fast Rebound (POINTS_DRIVER_REBOUND)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_REBOUND}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_REBOUND: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_REBOUND}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_REBOUND: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Late */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'תרגום מאוחר (POINTS_DRIVER_LATE)' : 'Late Translation (POINTS_DRIVER_LATE)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_LATE}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_LATE: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_LATE}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_LATE: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Frozen */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'רובוט קפוא (POINTS_DRIVER_FROZEN)' : 'Robot Frozen (POINTS_DRIVER_FROZEN)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_FROZEN}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_FROZEN: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_FROZEN}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_FROZEN: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Confused */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'נהג מבולבל (POINTS_DRIVER_CONFUSED)' : 'Driver Confused (POINTS_DRIVER_CONFUSED)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_CONFUSED}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_CONFUSED: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_CONFUSED}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_CONFUSED: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>

                        {/* Driver Stopped */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'הפסקת ניקוד (POINTS_DRIVER_STOPPED)' : 'Stopped Scoring (POINTS_DRIVER_STOPPED)'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_DRIVER_STOPPED}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_STOPPED: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_DRIVER_STOPPED}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_DRIVER_STOPPED: Number(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: Fouls & Penalties Detail */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveWeightsCategory(activeWeightsCategory === 'fouls' ? null : 'fouls')}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all select-none text-right ${
                        activeWeightsCategory === 'fouls' 
                          ? 'bg-rose-50/70 border-rose-200 text-rose-900 shadow-xs' 
                          : 'bg-slate-50 border-slate-200/85 text-slate-700 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${activeWeightsCategory === 'fouls' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200/60 text-slate-500'}`}>
                          <ShieldAlert size={14} />
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black uppercase tracking-tight">
                            {language === Language.HE ? 'פירוט עבירות ועונשים' : 'Fouls & Penalties'}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {language === Language.HE ? '4 קנסי עבירות מפורטים' : '4 detailed foul penalties'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight 
                          size={15} 
                          className={`transition-all duration-300 ${
                            activeWeightsCategory === 'fouls' ? 'rotate-90 text-rose-600' : 'text-slate-400'
                          }`} 
                        />
                      </div>
                    </button>

                    {activeWeightsCategory === 'fouls' && (
                      <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-4 shadow-inner-sm animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Gate Foul */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'עבירת שער (POINTS_FOUL_GATE)' : 'Gate Foul Penalty'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_FOUL_GATE}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_GATE: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_FOUL_GATE}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_GATE: Number(e.target.value) })}
                            className="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Parking Foul */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'עבירת חנייה (POINTS_FOUL_PARKING)' : 'Parking Foul Penalty'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_FOUL_PARKING}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_PARKING: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_FOUL_PARKING}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_PARKING: Number(e.target.value) })}
                            className="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* Intake Foul */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'עבירת אינטייק (POINTS_FOUL_INTAKE)' : 'Intake Foul Penalty'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_FOUL_INTAKE}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_INTAKE: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_FOUL_INTAKE}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_INTAKE: Number(e.target.value) })}
                            className="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                          />
                        </div>

                        {/* General / Fallback Foul */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                            <span>{language === Language.HE ? 'עבירות כללי / גיבוי (POINTS_FAUL)' : 'General / Fallback Foul Weight'}</span>
                            <input 
                              type="number" min="-100" max="100" 
                              value={sliderWeights.POINTS_FAUL}
                              onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                              className="w-14 text-center px-1 py-0.5 border-2 border-slate-300 rounded-md font-mono font-bold text-xs"
                            />
                          </div>
                          <input 
                            type="range" min="-100" max="100" dir="ltr"
                            value={sliderWeights.POINTS_FAUL}
                            onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                            className="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

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

      {isDeleteModalOpen && (
        <div id="delete-stats-modal-overlay" className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border-2 border-slate-900 p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative text-slate-700"
            dir={language === Language.HE ? 'rtl' : 'ltr'}
          >
            {/* Close Button */}
            <button 
              id="btn-close-delete-modal"
              onClick={() => setIsDeleteModalOpen(false)}
              className={`absolute top-6 ${language === Language.HE ? 'left-6' : 'right-6'} p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10`}
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="mb-6">
              <span className="text-[10px] font-black uppercase text-rose-600 tracking-widest">
                {language === Language.HE ? 'מחיקה של נתונים וסטטיסטיקות במערכת' : 'System Statistical Deletion'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mt-1">
                <Trash2 className="text-rose-600 animate-pulse" />
                {language === Language.HE ? 'מחיקת סטטיסטיקות וציוני קבוצות' : 'Delete Statistics'}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {language === Language.HE 
                  ? 'מחק לצמיתות נתוני משחקים או ציוני קבוצה - לא ניתן לבטל פעולות מחיקה!' 
                  : 'Permanently purge match details and calculations. This process is absolutely irreversible.'}
              </p>
            </div>

            {/* Content Body */}
            <div className="space-y-6">
              {/* Deletion Mode selector cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setDelMode('selected')}
                  className={`p-5 rounded-2xl border-2 text-start transition-all flex flex-col gap-2 cursor-pointer ${
                    delMode === 'selected'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-[4px_4px_0px_0px_rgba(79,70,229,1)] translate-x-[-2px] translate-y-[-2px]'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${delMode === 'selected' ? 'border-indigo-600' : 'border-slate-400'}`}>
                      {delMode === 'selected' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {language === Language.HE ? 'מחיקה לפי קבוצות נבחרות' : 'Delete Selected Teams'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed ps-8 font-medium">
                    {language === Language.HE
                      ? 'מחק את כל נתוני המשחקים והציונים השייכים לקבוצות ספציפיות שתבחר מן הרשימה.'
                      : 'Purges all statistics, reports, and grading computations belonging to specific teams.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDelMode('game')}
                  className={`p-5 rounded-2xl border-2 text-start transition-all flex flex-col gap-2 cursor-pointer ${
                    delMode === 'game'
                      ? 'border-amber-600 bg-amber-50/50 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] translate-x-[-2px] translate-y-[-2px]'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${delMode === 'game' ? 'border-amber-600' : 'border-slate-400'}`}>
                      {delMode === 'game' && <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {language === Language.HE ? 'מחיקה לפי מספר משחק' : 'Delete Game by Number'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed ps-8 font-medium">
                    {language === Language.HE
                      ? 'מחק את כל נתוני דוחות המשחק (בדרך כלל 4 מקצי סקאוטינג) השייכים למספר משחק ספציפי.'
                      : 'Purges all scouting reports and team data (usually 4 records) belonging to a specific match/game number.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDelMode('full')}
                  className={`p-5 rounded-2xl border-2 text-start transition-all flex flex-col gap-2 cursor-pointer ${
                    delMode === 'full'
                      ? 'border-rose-600 bg-rose-50/50 shadow-[4px_4px_0px_0px_rgba(225,29,72,1)] translate-x-[-2px] translate-y-[-2px]'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${delMode === 'full' ? 'border-rose-600' : 'border-slate-400'}`}>
                      {delMode === 'full' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {language === Language.HE ? 'מחיקה מלאה של כל הנתונים' : 'Full Reset / Wipe All'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed ps-8 font-medium">
                    {language === Language.HE
                      ? 'מחיקת המערכת כולה: מוחק את כל נתוני המשחקים, ההיסטוריה והציונים של כל הקבוצות.'
                      : 'Wipes the entire scouting database. Clears every single match record, scouter summary, and team score.'}
                  </p>
                </button>
              </div>

              {/* Checklist - visible only when 'selected' mode is active */}
              {delMode === 'selected' && (
                <div className="space-y-4 animate-in fade-in duration-300 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {language === Language.HE ? 'בחר קבוצות למחיקה' : 'Select Teams to Delete'}
                      </h4>
                      <p className="text-xs text-slate-400 font-bold mt-1 font-mono">
                        {language === Language.HE
                          ? `נבחרו ${delSelectedTeams.length} קבוצות מתוך ${uniqueTeams.length}`
                          : `${delSelectedTeams.length} of ${uniqueTeams.length} teams selected`}
                      </p>
                    </div>

                    <div className="flex gap-2.5 self-end sm:self-auto w-full sm:w-auto">
                      <div className="relative flex-grow sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder={language === Language.HE ? 'חפש מספר קבוצה...' : 'Filter team #...'}
                          value={delSearchTerm}
                          onChange={(e) => setDelSearchTerm(e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 focus:border-slate-900 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-bold outline-none transition-all"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (delSelectedTeams.length === uniqueTeams.length) {
                            setDelSelectedTeams([]);
                          } else {
                            setDelSelectedTeams([...uniqueTeams]);
                          }
                        }}
                        className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors shadow-sm"
                      >
                        {delSelectedTeams.length === uniqueTeams.length 
                          ? (language === Language.HE ? 'נקה הכל' : 'Clear All')
                          : (language === Language.HE ? 'בחר הכל' : 'Select All')}
                      </button>
                    </div>
                  </div>

                  {uniqueTeams.length === 0 ? (
                    <p className="text-slate-400 text-xs italic p-4 text-center border border-dashed border-slate-300 rounded-2xl bg-white font-bold">
                      {language === Language.HE ? 'לא נמצאו קבוצות רשומות במאגר.' : 'No teams discovered in the registry.'}
                    </p>
                  ) : (uniqueTeams.filter(t => t.toLowerCase().includes(delSearchTerm.trim().toLowerCase())).length === 0) ? (
                    <p className="text-slate-400 text-xs italic p-4 text-center border border-dashed border-slate-300 rounded-2xl bg-white font-bold">
                      {language === Language.HE ? 'אין תוצאות התואמות לחיפוש.' : 'No teams match your search filter.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[180px] overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-white">
                      {uniqueTeams
                        .filter(t => t.toLowerCase().includes(delSearchTerm.trim().toLowerCase()))
                        .map((teamNum) => {
                          const isChecked = delSelectedTeams.includes(teamNum);
                          return (
                            <button
                              key={teamNum}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setDelSelectedTeams(prev => prev.filter(t => t !== teamNum));
                                } else {
                                  setDelSelectedTeams(prev => [...prev, teamNum]);
                                }
                              }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all select-none font-bold text-xs text-slate-900 cursor-pointer ${
                                isChecked
                                  ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <span className="font-mono text-xs">{teamNum}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {isChecked && <Check size={10} strokeWidth={4} />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Checklist - visible only when 'game' mode is active */}
              {delMode === 'game' && (
                <div className="space-y-4 animate-in fade-in duration-300 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {language === Language.HE ? 'בחר משחקים למחיקה' : 'Select Games to Delete'}
                      </h4>
                      <p className="text-xs text-slate-400 font-bold mt-1 font-mono">
                        {language === Language.HE
                          ? `נבחרו ${delSelectedGames.length} משחקים מתוך ${uniqueMatches.length}`
                          : `${delSelectedGames.length} of ${uniqueMatches.length} games selected`}
                      </p>
                    </div>

                    <div className="flex gap-2.5 self-end sm:self-auto w-full sm:w-auto">
                      <div className="relative flex-grow sm:w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder={language === Language.HE ? 'חפש מקצה/משחק...' : 'Filter game #...'}
                          value={delGameSearchTerm}
                          onChange={(e) => setDelGameSearchTerm(e.target.value)}
                          className="w-full bg-white border-2 border-slate-300 focus:border-slate-900 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 font-bold outline-none transition-all"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (delSelectedGames.length === uniqueMatches.length) {
                            setDelSelectedGames([]);
                          } else {
                            setDelSelectedGames([...uniqueMatches]);
                          }
                        }}
                        className="whitespace-nowrap px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 transition-colors shadow-sm"
                      >
                        {delSelectedGames.length === uniqueMatches.length 
                          ? (language === Language.HE ? 'נקה הכל' : 'Clear All')
                          : (language === Language.HE ? 'בחר הכל' : 'Select All')}
                      </button>
                    </div>
                  </div>

                  {uniqueMatches.length === 0 ? (
                    <p className="text-slate-400 text-xs italic p-4 text-center border border-dashed border-slate-300 rounded-2xl bg-white font-bold">
                      {language === Language.HE ? 'לא נמצאו משחקים רשומים במאגר.' : 'No games discovered in the registry.'}
                    </p>
                  ) : (uniqueMatches.filter(t => t.toLowerCase().includes(delGameSearchTerm.trim().toLowerCase())).length === 0) ? (
                    <p className="text-slate-400 text-xs italic p-4 text-center border border-dashed border-slate-300 rounded-2xl bg-white font-bold">
                      {language === Language.HE ? 'אין תוצאות התואמות לחיפוש.' : 'No games match your search filter.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-[180px] overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-white">
                      {uniqueMatches
                        .filter(t => t.toLowerCase().includes(delGameSearchTerm.trim().toLowerCase()))
                        .map((gameNum) => {
                          const isChecked = delSelectedGames.includes(gameNum);
                          return (
                            <button
                              key={gameNum}
                              type="button"
                              onClick={() => {
                                if (isChecked) {
                                  setDelSelectedGames(prev => prev.filter(t => t !== gameNum));
                                } else {
                                  setDelSelectedGames(prev => [...prev, gameNum]);
                                }
                              }}
                              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all select-none font-bold text-xs text-slate-900 cursor-pointer ${
                                isChecked
                                  ? 'border-amber-500 bg-amber-55 text-amber-950 shadow-sm'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <span className="font-mono text-xs">{language === Language.HE ? `משחק ${gameNum}` : `Game ${gameNum}`}</span>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'}`}>
                                {isChecked && <Check size={10} strokeWidth={4} />}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Status and Error indicators */}
              {delStatus === 'error' && delError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2.5 animate-bounce">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{delError}</span>
                </div>
              )}
              {delStatus === 'success' && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
                  <Check size={16} className="text-emerald-500 shrink-0" />
                  <span>
                    {language === Language.HE 
                      ? 'הנתונים נמחקו בהצלחה מהשרת והציונים חושבו מחדש!' 
                      : 'Records successfully removed from Supabase and system updated!'}
                  </span>
                </div>
              )}

              {/* Primary action controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  {language === Language.HE ? 'סגור' : 'Close'}
                </button>

                <button
                  type="button"
                  disabled={delStatus === 'loading' || (delMode === 'selected' && delSelectedTeams.length === 0) || (delMode === 'game' && delSelectedGames.length === 0)}
                  onClick={() => setDelConfirmOpen(true)}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {delStatus === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {language === Language.HE ? 'מוחק...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      {language === Language.HE ? 'מחק נתונים לצמיתות' : 'Confirm Action'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Confirmation Modal */}
      {delConfirmOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 max-w-md w-full shadow-2xl text-slate-700 animate-in zoom-in-95 duration-200" dir={language === Language.HE ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3.5 mb-4 text-rose-600 font-bold">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0 text-rose-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-950 uppercase">
                  {language === Language.HE ? 'אישור מחיקה מוחלט' : 'Confirm Destructive Wipe'}
                </h4>
                <p className="text-[9px] text-rose-600 font-extrabold tracking-widest uppercase">
                  {language === Language.HE ? 'פעולה בלתי הפיכה בהחלט' : 'Warning: Action is completely irreversible'}
                </p>
              </div>
            </div>

            <div className="text-xs space-y-3 leading-relaxed mb-6 font-semibold text-slate-600">
              <p>
                {language === Language.HE
                  ? 'אתה עומד למחוק לצמיתות מידע רגיש ודוחות משחק ממסד הנתונים Supabase. פעולה זו לא ניתנת לשחזור בשום אופן!'
                  : 'This will permanently remove match reports and performance grades from Supabase database tables.'}
              </p>
              
              {delMode === 'full' ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-955 space-y-3">
                  <p className="font-extrabold text-xs">
                    {language === Language.HE 
                      ? 'בחרת במחיקה מלאה של המערכת. כל הדוחות וציוני כלל הקבוצות יימחקו לחלוטין.'
                      : 'You selected Full Reset / Wipe All. ALL team match records and aggregate scores will be wiped.'}
                  </p>
                  <p className="font-extrabold text-[10px]">
                    {language === Language.HE 
                      ? 'אנא הקלד את המילה DELETE (באותיות גדולות) לאישור המחיקה:' 
                      : 'Please type the word DELETE to confirm absolute wipe:'}
                  </p>
                  <input
                    type="text"
                    value={delConfirmInput}
                    onChange={(e) => setDelConfirmInput(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-white border-2 border-slate-900 rounded-lg px-3 py-2 font-mono text-center text-xs font-black outline-none tracking-widest text-slate-900"
                  />
                </div>
              ) : delMode === 'game' ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-955 font-bold">
                  <p className="font-extrabold text-xs">
                    {language === Language.HE 
                      ? `מחיקה לפי משחק: מוחק לצמיתות את כל נתוני המקצים עבור ${delSelectedGames.length} משחקים.`
                      : `Targeted purge: Wiping all scouting reports and grades for ${delSelectedGames.length} selected games.`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2.5 max-h-[100px] overflow-y-auto">
                    {delSelectedGames.map(g => (
                      <span key={g} className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px] font-extrabold text-slate-800">
                        {language === Language.HE ? `משחק ${g}` : `Game ${g}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-955">
                  <p className="font-extrabold text-xs">
                    {language === Language.HE 
                      ? `מחיקה סלקטיבית: מוחק לצמיתות את הנתונים והציונים של ${delSelectedTeams.length} קבוצות.`
                      : `Targeted purge: Wiping reports and grades for ${delSelectedTeams.length} selected teams.`}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2.5 max-h-[100px] overflow-y-auto">
                    {delSelectedTeams.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-white border border-amber-300 rounded font-mono text-[10px] font-extrabold text-slate-800">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setDelConfirmOpen(false);
                  setDelConfirmInput('');
                }}
                className="px-4 py-2 border border-slate-300 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-600 transition-colors uppercase cursor-pointer"
              >
                {language === Language.HE ? 'ביטול' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={delMode === 'full' && delConfirmInput.trim().toUpperCase() !== 'DELETE'}
                onClick={async () => {
                  setDelConfirmOpen(false);
                  setDelConfirmInput('');
                  await handleCommitDelete();
                  setIsDeleteModalOpen(false); // Close main modal upon success
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-widest cursor-pointer disabled:opacity-40"
              >
                {language === Language.HE ? 'אשר ומחק' : 'Confirm & Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUsersModalOpen && (
        <div id="users-management-modal-overlay" className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border-2 border-slate-900 p-6 sm:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto relative text-slate-700"
            dir={language === Language.HE ? 'rtl' : 'ltr'}
          >
            {/* Close Button */}
            <button 
              id="btn-close-users-modal"
              onClick={() => {
                setIsUsersModalOpen(false);
                setMgmtEditingUser(null);
                setMgmtUserName('');
                setMgmtUserPassword('');
                setMgmtSelectedRoles([]);
                setMgmtError(null);
                setMgmtStatus('idle');
              }}
              className={`absolute top-6 ${language === Language.HE ? 'left-6' : 'right-6'} p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 z-10`}
            >
              <X size={24} />
            </button>

            {/* Header */}
            <div className="mb-6 mr-10 ml-10">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                {language === Language.HE ? 'ניהול משתמשים והרשאות גישה' : 'Access Control & Credentials'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mt-1">
                <Users className="text-blue-600 animate-pulse" />
                {language === Language.HE ? 'ניהול משתמשים ומנהלים' : 'Users & Managers Management'}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {language === Language.HE 
                  ? 'הוסף משתמשים חדשים, עדכן סיסמאות או הגדר תפקידים (צופה, מנהל או שניהם).' 
                  : 'Configure user credentials, update passwords, and configure access levels.'}
              </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Form (Takes 5 spans) */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                <h3 className="text-md font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-600" />
                  {mgmtEditingUser 
                    ? (language === Language.HE ? `עדכון משתמש: ${mgmtEditingUser}` : `Edit User: ${mgmtEditingUser}`)
                    : (language === Language.HE ? 'הוספת משתמש חדש' : 'Create New User')
                  }
                </h3>

                <form onSubmit={handleSaveUser} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      {language === Language.HE ? 'שם משתמש' : 'Username'}
                    </label>
                    <input
                      type="text"
                      disabled={!!mgmtEditingUser}
                      placeholder={language === Language.HE ? 'הקלד שם משתמש...' : 'Type username...'}
                      value={mgmtUserName}
                      onChange={(e) => setMgmtUserName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:opacity-55 disabled:bg-slate-100 transition-all text-slate-900"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                      {language === Language.HE ? 'סיסמא' : 'Password'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === Language.HE ? 'הקלד סיסמא לגישה...' : 'Type access password...'}
                      value={mgmtUserPassword}
                      onChange={(e) => setMgmtUserPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900"
                    />
                  </div>

                  {/* Role Checkboxes */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      {language === Language.HE ? 'תפקידי משתמש במערכת' : 'Assigned Role(s)'}
                    </label>
                    
                    <div className="space-y-2">
                      {/* Scouter Role Toggle */}
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/55 transition-colors">
                        <input
                          type="checkbox"
                          checked={mgmtSelectedRoles.includes('scouter')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMgmtSelectedRoles([...mgmtSelectedRoles, 'scouter']);
                            } else {
                              setMgmtSelectedRoles(mgmtSelectedRoles.filter(r => r !== 'scouter'));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900">{language === Language.HE ? 'צופה (Scouter)' : 'Scouter Role'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{language === Language.HE ? 'מילוי והגשה של דוחות סקאוטינג' : 'Fill and submit scout reports'}</p>
                        </div>
                      </label>

                      {/* Admin/Manager Role Toggle */}
                      <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/55 transition-colors">
                        <input
                          type="checkbox"
                          checked={mgmtSelectedRoles.includes('admin')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMgmtSelectedRoles([...mgmtSelectedRoles, 'admin']);
                            } else {
                              setMgmtSelectedRoles(mgmtSelectedRoles.filter(r => r !== 'admin'));
                            }
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900">{language === Language.HE ? 'מנהל (Manager)' : 'Manager Role'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{language === Language.HE ? 'גישה ללוח הבקרה, הגדרות ומחיקה' : 'Dashboard control, configuration, dumps'}</p>
                        </div>
                      </label>
                    </div>

                    {/* Both notice */}
                    {mgmtSelectedRoles.includes('scouter') && mgmtSelectedRoles.includes('admin') && (
                      <p className="mt-2 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        {language === Language.HE 
                          ? 'בחרת בשני התפקידים. המערכת תייצר שתי שורות נפרדות עבור המשתמש, מה שיאפשר לו להתחבר גם כצופה וגם כמנהל.' 
                          : 'Dual selection: The database will register separate rows for dual login authorization.'}
                      </p>
                    )}
                  </div>

                  {/* Status & Error */}
                  {mgmtError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[10px] font-bold">
                      {mgmtError}
                    </div>
                  )}

                  {mgmtStatus === 'success' && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-[10px] font-bold flex items-center gap-1.5">
                      <Check size={12} />
                      {language === Language.HE ? 'המשתמש נשמר בהצלחה!' : 'User credentials saved successfully!'}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={mgmtStatus === 'loading'}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {mgmtStatus === 'loading' 
                        ? (language === Language.HE ? 'שומר...' : 'Saving...') 
                        : (language === Language.HE ? 'שמור משתמש' : 'Save User')
                      }
                    </button>

                    {mgmtEditingUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setMgmtEditingUser(null);
                          setMgmtUserName('');
                          setMgmtUserPassword('');
                          setMgmtSelectedRoles([]);
                          setMgmtError(null);
                          setMgmtStatus('idle');
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-slate-500 hover:bg-slate-100 font-bold text-xs uppercase transition-colors cursor-pointer"
                      >
                        {language === Language.HE ? 'ביטול' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Column: User List (Takes 7 spans) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-slate-600" />
                    {language === Language.HE ? 'משתמשים רשומים במאגר' : 'Registered Database Users'}
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full font-bold text-slate-500">
                      {usersList.length}
                    </span>
                  </h3>

                  {/* List Search Bar */}
                  <div className="relative max-w-xs w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 text-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder={language === Language.HE ? 'חפש לפי שם...' : 'Search user...'}
                      value={mgmtSearchTerm}
                      onChange={(e) => setMgmtSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-xs font-bold outline-none text-slate-800"
                    />
                  </div>
                </div>

                {/* Users List Container */}
                <div className="border border-slate-200 rounded-3xl max-h-[420px] overflow-y-auto divide-y divide-slate-100 bg-white">
                  {usersList.filter(u => u.name.toLowerCase().includes(mgmtSearchTerm.toLowerCase())).length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold text-xs leading-relaxed">
                      {language === Language.HE ? 'לא נמצאו משתמשים התואמים את החיפוש' : 'No registered users match your terms'}
                    </div>
                  ) : (
                    usersList
                      .filter(u => u.name.toLowerCase().includes(mgmtSearchTerm.toLowerCase()))
                      .map((usr) => {
                        return (
                          <div key={usr.name} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-900 truncate">
                                  {usr.name}
                                </span>
                                
                                {/* Roles Badges */}
                                <div className="flex gap-1 animate-in fade-in">
                                  {usr.roles.map(role => (
                                    <span 
                                      key={role} 
                                      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                        role === 'admin' 
                                          ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                          : 'bg-blue-100 text-blue-700 border-blue-200'
                                      }`}
                                    >
                                      {role === 'admin' ? (language === Language.HE ? 'מנהל' : 'Manager') : (language === Language.HE ? 'צופה' : 'Scouter')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                                {language === Language.HE ? 'סיסמא:' : 'Password:'} <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded-sm">{usr.password}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Edit Action */}
                              <button
                                type="button"
                                onClick={() => handleEditUserClick(usr)}
                                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-xl transition-all cursor-pointer"
                                title={language === Language.HE ? 'ערוך משתמש' : 'Edit Credentials'}
                              >
                                <Sliders size={12} />
                              </button>

                              {/* Delete Action */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(usr.name)}
                                className="p-2 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                                title={language === Language.HE ? 'מחק משתמש' : 'Delete User'}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsUsersModalOpen(false);
                  setMgmtEditingUser(null);
                  setMgmtUserName('');
                  setMgmtUserPassword('');
                  setMgmtSelectedRoles([]);
                  setMgmtError(null);
                  setMgmtStatus('idle');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                {language === Language.HE ? 'סגור' : 'Close'}
              </button>
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