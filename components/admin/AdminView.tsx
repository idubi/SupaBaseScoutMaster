import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Search, Table as TableIcon, BarChart3, LineChart as LineChartIcon, ArrowLeft, ChevronDown, Check, X, Trophy, RefreshCw, ScrollText, History, AlertCircle, Clock, LayoutGrid, Database, Sliders, HelpCircle } from 'lucide-react';
import { Language, SpreadsheetRow, TeamAggregatedData, ProcessLog } from '../../types';
import { AdminTranslation_EN, AdminTranslation_HE } from '../translations';
import { calculateTeamGrade } from '../../lib/gradingEngine';

interface AdminViewProps {
  language: Language;
  history: SpreadsheetRow[];
  teamsGrades: TeamAggregatedData[];
  isLoading: boolean;
  sheetName: string;
  onBack: () => void;
  onLogout: () => void;
  onSeed: () => void;
  onRecalculate: () => Promise<void>;
  isSeeding: boolean;
  isRecalculating: boolean;
  lastConsolidationTime: string | null;
  autoCalcActive: boolean;
  autoCalcSeconds: number;
  onUpdateSettings: (settings: { isAutoCalcActive?: boolean }) => void;
  onFetchGrades: () => void;
}

const CustomPerformanceTooltip = ({ active, payload, label, language, metricKey }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const details = data.details;

    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-200 min-w-[250px]" dir={language === Language.HE ? 'rtl' : 'ltr'}>
        <div className="font-black text-slate-800 border-b border-slate-100 pb-2 mb-2 flex justify-between items-center gap-4">
          <span>{label}</span>
          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-lg">
            {value}{['shooting', 'collection', 'behavior'].includes(metricKey) ? '%' : ''}
          </span>
        </div>
        
        <div className="text-sm space-y-2 text-slate-600">
          {metricKey === 'shooting' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סה״כ פגיעות' : 'Total Hits'}:</span> <span className="font-bold text-slate-800">{details.totalHits}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סה״כ כדורים (פגיעות + החטאות)' : 'Total Balls'}:</span> <span className="font-bold text-slate-800">{details.totalBalls}</span></div>
            </>
          )}
          {metricKey === 'collection' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'איסוף רצפה' : 'Floor Collection'}:</span> <span className="font-bold text-slate-800">{details.teleFloorCount} / {details.totalGames}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'איסוף ידני' : 'Manual Collection'}:</span> <span className="font-bold text-slate-800">{details.teleHumanPlayerCount} / {details.totalGames}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'איסוף אוטונומי' : 'Auto Collection'}:</span> <span className="font-bold text-slate-800">{details.autoIntakeCount} / {details.totalGames}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span>{language === Language.HE ? 'סה״כ איסוף' : 'Total Collection Actions'}:</span> <span className="font-bold text-slate-800">{details.collectionCount}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'פעולות אפשריות' : 'Possible Actions'}:</span> <span className="font-bold text-slate-800">{details.totalGames * 3}</span></div>
            </>
          )}
          {metricKey === 'scoring' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סה״כ פגיעות' : 'Total Hits'}:</span> <span className="font-bold text-slate-800">{details.totalHits}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</span> <span className="font-bold text-slate-800">{details.totalGames}</span></div>
            </>
          )}
          {metricKey === 'fouls' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סה״כ עבירות' : 'Total Fouls'}:</span> <span className="font-bold text-slate-800">{details.fouls}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</span> <span className="font-bold text-slate-800">{details.totalGames}</span></div>
            </>
          )}
          {metricKey === 'behavior' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'מודעות למגרש' : 'Field Awareness'}:</span> <span className="font-bold text-slate-800">{details.fieldAwarenessCount} / {details.totalGames}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'הצלחה כללית' : 'Overall Success'}:</span> <span className="font-bold text-slate-800">{details.overallSuccessCount} / {details.totalGames}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'פעולה עקבית/ללא בלבול' : 'Consistent Action/Not Confused'}:</span> <span className="font-bold text-slate-800">{details.notConfusedCount} / {details.totalGames}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span>{language === Language.HE ? 'סה״כ נקודות התנהגות' : 'Total Behavior Points'}:</span> <span className="font-bold text-slate-800">{details.behaviorScore}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'נקודות אפשריות' : 'Possible Points'}:</span> <span className="font-bold text-slate-800">{details.totalGames * 3}</span></div>
            </>
          )}
          {metricKey === 'autonomous' && (
            <>
              <div className="flex justify-between"><span>{language === Language.HE ? 'פגיעות אוטונומי' : 'Auto Hits'}:</span> <span className="font-bold text-slate-800">{details.autoHits}</span></div>
              <div className="flex justify-between"><span>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</span> <span className="font-bold text-slate-800">{details.totalGames}</span></div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
};

const AdminView: React.FC<AdminViewProps> = ({ 
  language, 
  history, 
  teamsGrades, 
  isLoading, 
  sheetName, 
  onBack, 
  onLogout,
  onSeed,
  onRecalculate,
  isSeeding,
  isRecalculating,
  lastConsolidationTime,
  autoCalcActive,
  autoCalcSeconds,
  onUpdateSettings,
  onFetchGrades
}) => {
  const [activeTab, setActiveTab] = useState<'investigation' | 'compare' | 'game'>('investigation');
  const [compareSubTab, setCompareSubTab] = useState<'ranking' | 'performance'>('ranking');
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Dynamic config states
  const [dbWeights, setDbWeights] = useState({
    POINTS_AUTO_HIT: 7,
    POINTS_TELEOP_HIT: 5,
    POINTS_PARKING: 5,
    POINTS_AUTO_MISS: -1,
    POINTS_TELEOP_MISS: -1,
    POINTS_FAUL: 0,
    POINTS_FOUL_GATE: -2,
    POINTS_FOUL_PARKING: -2,
    POINTS_FOUL_INTAKE: -2
  });
  const [sliderWeights, setSliderWeights] = useState({
    POINTS_AUTO_HIT: 7,
    POINTS_TELEOP_HIT: 5,
    POINTS_PARKING: 5,
    POINTS_AUTO_MISS: -1,
    POINTS_TELEOP_MISS: -1,
    POINTS_FAUL: 0,
    POINTS_FOUL_GATE: -2,
    POINTS_FOUL_PARKING: -2,
    POINTS_FOUL_INTAKE: -2
  });
  const [showHelp, setShowHelp] = useState(false);
  const [isSavingWeights, setIsSavingWeights] = useState(false);
  const [simulatedGrades, setSimulatedGrades] = useState<any[]>([]);

  // Load weights from database
  const fetchWeights = async () => {
    try {
      const res = await fetch('/api/grading-config');
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.config) {
          const w = {
            POINTS_AUTO_HIT: Number(body.config.POINTS_AUTO_HIT ?? 7),
            POINTS_TELEOP_HIT: Number(body.config.POINTS_TELEOP_HIT ?? 5),
            POINTS_PARKING: Number(body.config.POINTS_PARKING ?? 5),
            POINTS_AUTO_MISS: Number(body.config.POINTS_AUTO_MISS ?? -1),
            POINTS_TELEOP_MISS: Number(body.config.POINTS_TELEOP_MISS ?? -1),
            POINTS_FAUL: Number(body.config.POINTS_FAUL ?? 0),
            POINTS_FOUL_GATE: Number(body.config.POINTS_FOUL_GATE ?? -2),
            POINTS_FOUL_PARKING: Number(body.config.POINTS_FOUL_PARKING ?? -2),
            POINTS_FOUL_INTAKE: Number(body.config.POINTS_FOUL_INTAKE ?? -2)
          };
          setDbWeights(w);
          setSliderWeights(w);
        }
      }
    } catch (err) {
      console.error("Failed to fetch grading configuration weights", err);
    }
  };

  useEffect(() => {
    fetchWeights();
  }, []);

  // Run in-memory simulation with current slider values
  const runSimulation = () => {
    if (!teamsGrades || teamsGrades.length === 0) return;
    
    const simulated = teamsGrades.map(team => {
      const simulatedResult = calculateTeamGrade(team, sliderWeights);
      return {
        TeamNumber: team.TeamNumber,
        GAMES_COUNT: team.GAMES_COUNT,
        TOTAL_TELEOP_HIT: team.TOTAL_TELEOP_HIT,
        TOTAL_AUTONOMUS_HIT: team.TOTAL_AUTONOMUS_HIT,
        TOTAL_TELEOP_MISS: team.TOTAL_TELEOP_MISS,
        TOTAL_AUTONOMUS_MISS: team.TOTAL_AUTONOMUS_MISS,
        TOTAL_IS_FULL_PARKING: team.TOTAL_IS_FULL_PARKING,
        TOTAL_FOULS: team.TOTAL_FOULS,
        GRADE: simulatedResult.grade,
        RATIO: simulatedResult.ratio
      };
    });

    // Sort descending by simulated grade
    simulated.sort((a, b) => b.GRADE - a.GRADE);
    
    // Assign simulated rank
    const ranked = simulated.map((team, idx) => ({
      ...team,
      RANK: idx + 1
    }));
    
    setSimulatedGrades(ranked);
  };

  useEffect(() => {
    runSimulation();
  }, [teamsGrades, sliderWeights]);

  const handleSaveWeights = async () => {
    setIsSavingWeights(true);
    try {
      const res = await fetch('/api/grading-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sliderWeights)
      });
      if (res.ok) {
        await fetchWeights();
        if (onRecalculate) {
          await onRecalculate();
        }
        alert(isRTL ? 'הגדרות נשמרו בהצלחה והציונים חושבו מחדש!' : 'Weights successfully saved and grades recalculated!');
      } else {
        alert(isRTL ? 'שגיאה בשמירת הגדרות' : 'Failed to save weights');
      }
    } catch (err) {
      console.error(err);
      alert(isRTL ? 'שגיאה בתקשורת עם השרת' : 'Connection error');
    } finally {
      setIsSavingWeights(false);
    }
  };

  const handleCancelWeights = () => {
    setSliderWeights({ ...dbWeights });
  };

  // Countdown timer for automatic calculation
  useEffect(() => {
    if (!autoCalcActive || !lastConsolidationTime || !autoCalcSeconds) {
      setSecondsRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const last = new Date(lastConsolidationTime).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - last) / 1000);
      const remaining = Math.max(0, autoCalcSeconds - elapsed);
      setSecondsRemaining(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [autoCalcActive, lastConsolidationTime, autoCalcSeconds]);

  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');
  const [logs, setLogs] = useState<ProcessLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<any | null>(null);
  
  const matchDropdownRef = useRef<HTMLDivElement>(null);

  const handleRunDiagnostics = async () => {
    setIsDiagnosing(true);
    setDiagResult(null);
    try {
      const res = await fetch('/api/health-check');
      if (res.ok) {
        const data = await res.json();
        setDiagResult(data);
      } else {
        const errText = await res.text();
        setDiagResult({ status: 'error', error: errText });
      }
    } catch (e) {
      setDiagResult({ status: 'error', error: String(e) });
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const res = await fetch('/api/process-logs');
          if (res.ok) {
            const data = await res.json();
            setLogs(data);
          }
        } catch (e) {
          console.error("Failed to fetch process logs", e);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchLogs();
      const interval = setInterval(fetchLogs, 45000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);
  
  // Sync team selection
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['auto_hit', 'tele_hit']);
  const [selectedInvestigationMetrics, setSelectedInvestigationMetrics] = useState<string[]>(['hit', 'miss', 'ratio']);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [isInvestigationDropdownOpen, setIsInvestigationDropdownOpen] = useState(false);
  const [gameViewTeam, setGameViewTeam] = useState<string>('');
  const [gameViewMatch, setGameViewMatch] = useState<string>('');
  const [compareSelectedTeams, setCompareSelectedTeams] = useState<string[]>([]);
  const [prevGameViewMatch, setPrevGameViewMatch] = useState<string>('');
  const [gameViewError, setGameViewError] = useState<string | null>(null);
  const [isGameTeamDropdownOpen, setIsGameTeamDropdownOpen] = useState(false);
  const [isGameMatchDropdownOpen, setIsGameMatchDropdownOpen] = useState(false);
  const [isCompareTeamDropdownOpen, setIsCompareTeamDropdownOpen] = useState(false);
  const [selectedGradeDetails, setSelectedGradeDetails] = useState<any | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const metricDropdownRef = useRef<HTMLDivElement>(null);

  // Trigger grades fetch only when viewing compare tab with selected teams
  useEffect(() => {
    if (activeTab === 'compare' && compareSelectedTeams.length > 0) {
      onFetchGrades();
    }
  }, [activeTab, compareSelectedTeams, onFetchGrades]);
  const investigationDropdownRef = useRef<HTMLDivElement>(null);
  const gameTeamDropdownRef = useRef<HTMLDivElement>(null);
  const gameMatchDropdownRef = useRef<HTMLDivElement>(null);
  const compareTeamDropdownRef = useRef<HTMLDivElement>(null);

  // Derived searchTeam for investigation tab from selectedTeams
  const searchTeam = useMemo(() => {
    return selectedTeams.length > 0 ? selectedTeams[0] : '';
  }, [selectedTeams]);

  const t = language === Language.HE ? AdminTranslation_HE : AdminTranslation_EN;
  const isRTL = language === Language.HE;

  const COMPARISON_METRICS = [
    { id: 'auto_hit', label: t.autoHit },
    { id: 'auto_miss', label: t.autoMiss },
    { id: 'tele_hit', label: t.teleHit },
    { id: 'tele_miss', label: t.teleMiss },
    { id: 'total_hit', label: t.totalHit },
    { id: 'auto_ratio', label: t.autoRatio },
    { id: 'tele_ratio', label: t.teleRatio },
    { id: 'total_ratio', label: t.totalRatio },
    { id: 'gate_foul', label: t.gateFoulMetric },
    { id: 'intake_foul', label: t.intakeFoulMetric },
    { id: 'leave', label: t.leaveMetric },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsTeamDropdownOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target as Node)) {
        setIsMetricDropdownOpen(false);
      }
      if (investigationDropdownRef.current && !investigationDropdownRef.current.contains(event.target as Node)) {
        setIsInvestigationDropdownOpen(false);
      }
      if (matchDropdownRef.current && !matchDropdownRef.current.contains(event.target as Node)) {
        setIsMatchDropdownOpen(false);
      }
      if (gameTeamDropdownRef.current && !gameTeamDropdownRef.current.contains(event.target as Node)) {
        setIsGameTeamDropdownOpen(false);
      }
      if (gameMatchDropdownRef.current && !gameMatchDropdownRef.current.contains(event.target as Node)) {
        setIsGameMatchDropdownOpen(false);
      }
      if (compareTeamDropdownRef.current && !compareTeamDropdownRef.current.contains(event.target as Node)) {
        setIsCompareTeamDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track unique teams fetched from server
  const [serverUniqueTeams, setServerUniqueTeams] = useState<string[]>([]);
  
  // Fetch distinct teams from API on mount
  useEffect(() => {
    const fetchTeams = async () => {
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
    fetchTeams();
  }, []);

  const uniqueTeams = useMemo(() => {
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

  // Auto-select all teams for comparison by default when uniqueTeams is populated
  useEffect(() => {
    if (uniqueTeams.length > 0 && compareSelectedTeams.length === 0) {
      setCompareSelectedTeams(uniqueTeams);
    }
  }, [uniqueTeams.length]); // Use length as dependency to avoid unnecessary triggers

  const uniqueMatches = useMemo(() => {
    try {
      const matches = history
        .map(row => (row.matchNumber || row.gameNumber || '').toString().trim())
        .filter(m => !!m);
      return Array.from(new Set(matches)).sort((a: string, b: string) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        if (numA === 0 && numB === 0) return a.localeCompare(b);
        return numA - numB;
      });
    } catch (err) {
      console.error("Error calculating unique matches:", err);
      return [];
    }
  }, [history]);

  useEffect(() => {
    if (!selectedMatch && uniqueMatches.length > 0) {
      setSelectedMatch(uniqueMatches[0]);
    }
    if (!gameViewMatch && uniqueMatches.length > 0) {
      setGameViewMatch(uniqueMatches[0]);
    }
    if (!gameViewTeam && uniqueTeams.length > 0) {
      setGameViewTeam(uniqueTeams[0]);
    }
  }, [uniqueMatches, uniqueTeams, selectedMatch, gameViewMatch, gameViewTeam]);

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const toggleAllTeams = () => {
    if (selectedTeams.length === uniqueTeams.length) {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(uniqueTeams);
    }
  };

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const toggleInvestigationMetric = (metric: string) => {
    setSelectedInvestigationMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(m => m !== metric);
      }
      return [...prev, metric];
    });
  };

  const teamStats = useMemo(() => {
    if (!searchTeam) return null;
    const search = searchTeam.trim().toLowerCase();
    const teamRows = history.filter(row => 
      row.recordType === 'MATCH_COMPLETE' && 
      row.teamScouted?.toString().trim().toLowerCase() === search
    );

    if (teamRows.length === 0) return null;

    const total = teamRows.length;
    const stats = {
      autoHit: 0,
      autoMiss: 0,
      teleHit: 0,
      teleMiss: 0,
      
      // Intake
      teleFloor: 0,
      teleHuman: 0,
      autoIntake: 0,
      
      // Shooting Capabilities
      autoBig: 0,
      autoSmall: 0,
      teleBig: 0,
      teleSmall: 0,
      autoLeave: 0,
      
      // Fouls
      foulIntake: 0,
      foulGate: 0,
      foulPark: 0,
      foulTotal: 0,
    };

    teamRows.forEach(row => {
      stats.autoHit += (row.autoBallHit || 0);
      stats.autoMiss += (row.autoBallMiss || 0);
      stats.teleHit += (row.teleBallHit || 0);
      stats.teleMiss += (row.teleBallMiss || 0);
      
      if (row.teleFloor === true) stats.teleFloor++;
      if (row.teleHumanPlayer === true) stats.teleHuman++;
      if (row.autoIntakeUsed === true) stats.autoIntake++;
      
      if (row.isAutoZoneBig === true) stats.autoBig++;
      if (row.isAutoZoneSmall === true) stats.autoSmall++;
      if (row.isTeleopZoneBig === true) stats.teleBig++;
      if (row.isTeleopZoneSmall === true) stats.teleSmall++;
      if (row.isAutoLeave === true) stats.autoLeave++;
      
      if (row.teleIntakeFoul === true) stats.foulIntake++;
      if (row.teleGateFoul === true) stats.foulGate++;
      if (row.teleParkingFoul === true) stats.foulPark++;
      stats.foulTotal += (row.teleIntakeFoul === true ? 1 : 0) + (row.teleGateFoul === true ? 1 : 0) + (row.teleParkingFoul === true ? 1 : 0);
    });

    const avg = (val: number) => (val / total).toFixed(1);
    const pct = (val: number) => ((val / total) * 100).toFixed(0);
    const ratio = (hit: number, miss: number) => {
      const sum = hit + miss;
      return sum > 0 ? ((hit / sum) * 100).toFixed(0) : "0";
    };

    return {
      auto: {
        total: stats.autoHit,
        miss: stats.autoMiss,
        avg: avg(stats.autoHit),
        ratio: ratio(stats.autoHit, stats.autoMiss)
      },
      tele: {
        total: stats.teleHit,
        miss: stats.teleMiss,
        avg: avg(stats.teleHit),
        ratio: ratio(stats.teleHit, stats.teleMiss)
      },
      intake: {
        teleFloor: pct(stats.teleFloor),
        teleHuman: pct(stats.teleHuman),
        auto: pct(stats.autoIntake)
      },
      shooting: {
        autoBig: pct(stats.autoBig),
        autoSmall: pct(stats.autoSmall),
        teleBig: pct(stats.teleBig),
        teleSmall: pct(stats.teleSmall),
        autoLeave: pct(stats.autoLeave)
      },
      fouls: {
        intake: stats.foulIntake,
        gate: stats.foulGate,
        park: stats.foulPark,
        total: stats.foulTotal
      }
    };
  }, [history.length, searchTeam]);

  const filteredData = useMemo(() => {
    if (!searchTeam) return [];
    const search = searchTeam.trim().toLowerCase();

    return history
      .filter(row => {
        const isMatchComplete = row.recordType === 'MATCH_COMPLETE';
        const teamScoutedMatch = row.teamScouted && row.teamScouted.toString().trim().toLowerCase() === search;
        return isMatchComplete && teamScoutedMatch;
      })
      .sort((a, b) => {
        const matchA = parseInt(a.matchNumber || '0');
        const matchB = parseInt(b.matchNumber || '0');
        return matchA - matchB;
      })
      .map((row, index) => {
        const autoHit = row.autoBallHit || 0;
        const autoMiss = row.autoBallMiss || 0;
        const teleHit = row.teleBallHit || 0;
        const teleMiss = row.teleBallMiss || 0;
        const hit = autoHit + teleHit;
        const miss = autoMiss + teleMiss;
        const totalBalls = hit + miss;
        return {
          game: row.matchNumber || `G${index + 1}`,
          hit: hit,
          miss: miss,
          ratio: totalBalls > 0 ? parseFloat(((hit / totalBalls) * 100).toFixed(1)) : 0,
          fouls: (row.teleGateFoul === true ? 1 : 0) + (row.teleParkingFoul === true ? 1 : 0) + (row.teleIntakeFoul === true ? 1 : 0),
          gateFoul: row.teleGateFoul === true ? 1 : 0,
          parkFoul: row.teleParkingFoul === true ? 1 : 0,
          intakeFoul: row.teleIntakeFoul === true ? 1 : 0,
          autoNotes: row.autoNotes || '',
          teleComments: row.teleComments || '',
          raw: row
        };
      });
  }, [history.length, searchTeam]);

  const investigationTotals = useMemo(() => {
    if (filteredData.length === 0) return null;
    const totals = filteredData.reduce((acc, curr) => ({
      hit: acc.hit + curr.hit,
      miss: acc.miss + curr.miss,
      fouls: acc.fouls + curr.fouls,
      gateFoul: acc.gateFoul + curr.gateFoul,
      parkFoul: acc.parkFoul + curr.parkFoul,
      intakeFoul: acc.intakeFoul + curr.intakeFoul
    }), { hit: 0, miss: 0, fouls: 0, gateFoul: 0, parkFoul: 0, intakeFoul: 0 });

    const totalBalls = totals.hit + totals.miss;
    return {
      ...totals,
      game: t.total,
      ratio: totalBalls > 0 ? parseFloat(((totals.hit / totalBalls) * 100).toFixed(1)) : 0
    };
  }, [filteredData, t.total]);

  const compareData = useMemo(() => {
    if (compareSelectedTeams.length === 0) return [];
    
    const matchMap: Record<string, any> = {};
    
    history.forEach(row => {
      if (row.recordType !== 'MATCH_COMPLETE') return;
      const team = row.teamScouted?.toString();
      if (!team || !compareSelectedTeams.includes(team)) return;
      
      const matchNum = row.matchNumber || '0';
      if (!matchMap[matchNum]) {
        matchMap[matchNum] = { match: matchNum };
      }
      
      // Calculate value based on selected metrics
      let value = 0;
      if (selectedMetrics.includes('auto_hit')) value += (row.autoBallHit || 0);
      if (selectedMetrics.includes('auto_miss')) value += (row.autoBallMiss || 0);
      if (selectedMetrics.includes('tele_hit')) value += (row.teleBallHit || 0);
      if (selectedMetrics.includes('tele_miss')) value += (row.teleBallMiss || 0);
      if (selectedMetrics.includes('total_hit')) value += ((row.autoBallHit || 0) + (row.teleBallHit || 0));
      
      if (selectedMetrics.includes('auto_ratio')) {
        const hits = row.autoBallHit || 0;
        const misses = row.autoBallMiss || 0;
        const total = hits + misses;
        value += total > 0 ? (hits / total) * 100 : 0;
      }
      if (selectedMetrics.includes('tele_ratio')) {
        const hits = row.teleBallHit || 0;
        const misses = row.teleBallMiss || 0;
        const total = hits + misses;
        value += total > 0 ? (hits / total) * 100 : 0;
      }
      if (selectedMetrics.includes('total_ratio')) {
        const hits = (row.autoBallHit || 0) + (row.teleBallHit || 0);
        const misses = (row.autoBallMiss || 0) + (row.teleBallMiss || 0);
        const total = hits + misses;
        value += total > 0 ? (hits / total) * 100 : 0;
      }

      if (selectedMetrics.includes('gate_foul')) value += (row.teleGateFoul === true ? 1 : 0);
      if (selectedMetrics.includes('intake_foul')) value += (row.teleIntakeFoul === true ? 1 : 0);
      if (selectedMetrics.includes('leave')) value += (row.isAutoLeave === true ? 1 : 0);
      
      matchMap[matchNum][team] = parseFloat(value.toFixed(2));
    });
    
    return Object.values(matchMap).sort((a, b) => parseInt(a.match) - parseInt(b.match));
  }, [history.length, compareSelectedTeams, selectedMetrics]);

  const COLORS = ['#818cf8', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

  const rankedTeams = useMemo(() => {
    if (!teamsGrades || !Array.isArray(teamsGrades) || teamsGrades.length === 0) return [];

    // 1. Ensure uniqueness by TeamNumber (take the first occurrence)
    const uniqueGradesMap = new Map<string, TeamAggregatedData>();
    teamsGrades.forEach(team => {
      const teamNum = team.TeamNumber?.toString().trim();
      if (teamNum && !uniqueGradesMap.has(teamNum)) {
        uniqueGradesMap.set(teamNum, team);
      }
    });
    const uniqueTeamsGrades = Array.from(uniqueGradesMap.values());

    // 2. Calculate grades for all teams
    const teamsWithGrades = uniqueTeamsGrades.map(teamData => {
      const { grade, ratio, gradeDetails } = calculateTeamGrade(teamData, sliderWeights);
      return {
        ...teamData,
        grade,
        ratio,
        gradeDetails
      };
    });

    // 3. Sort by Grade DESC, then Ratio DESC
    const sorted = [...teamsWithGrades].sort((a, b) => {
      if (b.grade !== a.grade) return b.grade - a.grade;
      return b.ratio - a.ratio;
    });

    // 4. Assign Absolute Rank
    return sorted.map((team, index) => ({
      ...team,
      rank: index + 1
    }));
  }, [teamsGrades]);

  const filteredRankedTeams = useMemo(() => {
    if (compareSelectedTeams.length === 0) return rankedTeams;
    return rankedTeams
      .filter(team => {
        const teamNum = team.TeamNumber?.toString().trim();
        return compareSelectedTeams.includes(teamNum || '');
      })
      .sort((a, b) => a.rank - b.rank);
  }, [rankedTeams, compareSelectedTeams]);

  const [selectedPerformanceDetails, setSelectedPerformanceDetails] = useState<{
    team: string;
    category: 'shooting' | 'collection' | 'scoring' | 'fouls' | 'behavior' | 'autonomous';
    data: any;
  } | null>(null);

  const performanceComparisonData = useMemo(() => {
    if (compareSelectedTeams.length === 0) return [];
    
    return compareSelectedTeams.map((teamNum, idx) => {
      const teamRows = history.filter(r => r.recordType === 'MATCH_COMPLETE' && r.teamScouted?.toString() === teamNum);
      const totalGames = teamRows.length;
      
      const emptyDetails = { totalHits: 0, totalMisses: 0, totalBalls: 0, totalGames: 0, collectionCount: 0, fouls: 0, behaviorScore: 0, fieldAwarenessCount: 0, overallSuccessCount: 0, notConfusedCount: 0, autoHits: 0, teleFloorCount: 0, teleHumanPlayerCount: 0, autoIntakeCount: 0 };

      if (totalGames === 0) {
        return {
          team: teamNum,
          shooting: 0,
          collection: 0,
          scoring: 0,
          fouls: 0,
          behavior: 0,
          autonomous: 0,
          color: COLORS[idx % COLORS.length],
          details: emptyDetails
        };
      }

      let totalHits = 0;
      let totalMisses = 0;
      let autoHits = 0;
      let fouls = 0;
      let behaviorScore = 0;
      let fieldAwarenessCount = 0;
      let overallSuccessCount = 0;
      let notConfusedCount = 0;
      let collectionCount = 0;
      let teleFloorCount = 0;
      let teleHumanPlayerCount = 0;
      let autoIntakeCount = 0;

      teamRows.forEach(r => {
        const h = (r.autoBallHit || 0) + (r.teleBallHit || 0);
        const m = (r.autoBallMiss || 0) + (r.teleBallMiss || 0);
        totalHits += h;
        totalMisses += m;
        autoHits += (r.autoBallHit || 0);
        fouls += (r.teleGateFoul === true ? 1 : 0) + (r.teleParkingFoul === true ? 1 : 0) + (r.teleIntakeFoul === true ? 1 : 0);
        
        // Behavioral proxy
        if (r.teleFieldAwareness) { behaviorScore++; fieldAwarenessCount++; }
        if (r.teleOverallSuccess) { behaviorScore++; overallSuccessCount++; }
        if (!r.teleConfused) { behaviorScore++; notConfusedCount++; }
        
        // Collection proxy
        if (r.teleFloor) { collectionCount++; teleFloorCount++; }
        if (r.teleHumanPlayer) { collectionCount++; teleHumanPlayerCount++; }
        if (r.autoIntakeUsed) { collectionCount++; autoIntakeCount++; }
      });


      const totalBalls = totalHits + totalMisses;
      
      return {
        team: teamNum,
        shooting: totalBalls > 0 ? Math.round((totalHits / totalBalls) * 100) : 0,
        collection: Math.round((collectionCount / (totalGames * 3)) * 100),
        scoring: Math.round((totalHits / totalGames) * 10) / 10, // Avg hits per game
        fouls: Math.round((fouls / totalGames) * 10) / 10, // Avg fouls per game
        behavior: Math.round((behaviorScore / (totalGames * 3)) * 100), // Pct of possible positive behaviors
        autonomous: Math.round((autoHits / totalGames) * 10) / 10, // Avg auto hits
        color: COLORS[idx % COLORS.length],
        details: {
           totalHits,
           totalMisses,
           totalBalls,
           totalGames,
           collectionCount,
           fouls,
           behaviorScore,
           fieldAwarenessCount,
           overallSuccessCount,
           notConfusedCount,
           autoHits,
           teleFloorCount,
           teleHumanPlayerCount,
           autoIntakeCount
        }
      };
    });
  }, [history, compareSelectedTeams]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header & Navigation */}
      <div className="flex items-center gap-4 relative" dir="ltr">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 shrink-0"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-grow pr-12" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('investigation')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'investigation' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {t.investigateTeam}
              </button>
              <button 
                onClick={() => setActiveTab('compare')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'compare' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {t.compareTeams}
              </button>
              <button 
                onClick={() => setActiveTab('game')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'game' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {t.gameView}
              </button>
            </div>
          </div>
          
          {((activeTab === 'investigation' && selectedTeams.length > 0) || (activeTab === 'compare' && compareSubTab === 'performance' && compareSelectedTeams.length > 0)) && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <span className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">{t.graphTable}</span>
              <div className="flex bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setViewMode('graph')}
                  className={`px-3 py-1 rounded-md transition-all ${viewMode === 'graph' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  <BarChart3 size={14} />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-md transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                >
                  <TableIcon size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={onLogout}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 shrink-0"
        >
          <X size={24} />
        </button>
      </div>

      {activeTab === 'investigation' && (
        <div className="space-y-6">
          {/* Investigation Controls */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative" ref={investigationDropdownRef}>
                <button 
                  onClick={() => setIsInvestigationDropdownOpen(!isInvestigationDropdownOpen)}
                  className="w-full bg-white border-2 border-slate-900 rounded-xl px-4 py-4 flex items-center justify-between text-slate-900 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Search size={20} className="text-slate-400" />
                    <span>{searchTeam || t.teamLabel}</span>
                  </div>
                  <ChevronDown size={20} className={`transition-transform ${isInvestigationDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isInvestigationDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border-2 border-slate-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {uniqueTeams.map(team => (
                        <button 
                          key={team}
                          onClick={() => {
                            setSelectedTeams([team]);
                            setIsInvestigationDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 hover:bg-slate-100 rounded-lg transition-colors group ${searchTeam === team ? 'bg-slate-50' : ''}`}
                        >
                          <span className="font-bold text-slate-900">{team}</span>
                          {searchTeam === team && <Check size={16} className="text-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Checkboxes */}
            <div className="bg-white border-2 border-slate-900 rounded-xl p-4 flex flex-wrap items-center gap-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {[
                { id: 'hit', label: t.hit },
                { id: 'miss', label: t.miss },
                { id: 'ratio', label: t.ratio },
                { id: 'fouls', label: t.fouls }
              ].map(item => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => toggleInvestigationMetric(item.id)}
                    className={`w-6 h-6 border-2 border-slate-900 rounded flex items-center justify-center transition-colors ${selectedInvestigationMetrics.includes(item.id) ? 'bg-slate-900' : 'bg-white'}`}
                  >
                    {selectedInvestigationMetrics.includes(item.id) && <Check size={16} className="text-white" />}
                  </div>
                  <span className="font-black text-slate-900 uppercase tracking-widest text-xs">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Investigation Content Area */}
          <div className="space-y-6">
            {/* Header Data Section */}
            {searchTeam && teamStats && (
              <div className="bg-slate-100/50 rounded-[2rem] p-6 border border-slate-200 shadow-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Fouls Stats */}
                  <div className="flex flex-col border-2 border-slate-900 rounded-xl p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-[14px] mb-3 text-center border-b-2 border-slate-900 pb-1">
                      {t.penalties}
                    </span>
                    <div className="space-y-2">
                      {[
                        { label: t.intake, value: teamStats.fouls.intake },
                        { label: t.gate, value: teamStats.fouls.gate },
                        { label: t.park, value: teamStats.fouls.park },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="font-black text-slate-900 text-[12px]">{item.label}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-3 text-center font-black text-slate-900 min-w-[60px] text-[12px]">
                            {item.value}
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t-2 border-slate-900 flex items-center justify-between gap-2">
                        <span className="font-black text-slate-900 text-[12px] uppercase">{t.total}</span>
                        <div className="bg-amber-200 border-2 border-slate-900 rounded-lg py-1 px-3 text-center font-black text-slate-900 min-w-[60px] text-[12px]">
                          {teamStats.fouls.total}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shooting Capabilities Stats */}
                  <div className="flex flex-col border-2 border-slate-900 rounded-xl p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-[14px] mb-3 text-center border-b-2 border-slate-900 pb-1">
                      {t.shootingCapabilities}
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="block text-center text-[12px] font-black text-slate-400 uppercase">{t.tele}</span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-[12px]">{t.big}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                            {teamStats.shooting.teleBig}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-[12px]">{t.small}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                            {teamStats.shooting.teleSmall}%
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="block text-center text-[12px] font-black text-slate-400 uppercase">{t.auto}</span>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-[12px]">{t.big}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                            {teamStats.shooting.autoBig}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-slate-900 text-[12px]">{t.small}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                            {teamStats.shooting.autoSmall}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 border-t-2 border-slate-900 flex items-center justify-between gap-2">
                      <span className="font-black text-slate-900 text-[12px]">{t.autoLeavePct}</span>
                      <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-3 text-center font-black text-slate-900 min-w-[60px] text-[12px]">
                        {teamStats.shooting.autoLeave}%
                      </div>
                    </div>
                  </div>

                  {/* Intake Capabilities Stats */}
                  <div className="flex flex-col border-2 border-slate-900 rounded-xl p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-[14px] mb-3 text-center border-b-2 border-slate-900 pb-1">
                      {t.intakeCapabilities}
                    </span>
                    <div className="space-y-2">
                      {[
                        { label: t.floor, value: teamStats.intake.teleFloor },
                        { label: t.human, value: teamStats.intake.teleHuman },
                        { label: t.auto, value: teamStats.intake.auto },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="font-black text-slate-900 text-[12px]">{item.label}</span>
                          <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-3 text-center font-black text-slate-900 min-w-[60px] text-[12px]">
                            {item.value}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shooting Stats */}
                  <div className="flex flex-col border-2 border-slate-900 rounded-xl p-3 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <span className="font-black text-slate-900 uppercase tracking-widest text-[14px] mb-3 text-center border-b-2 border-slate-900 pb-1">
                      {t.shooting}
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="block text-center text-[12px] font-black text-slate-400 uppercase">{t.tele}</span>
                        {[
                          { label: t.totalHits, value: teamStats.tele.total },
                          { label: t.totalMisses, value: teamStats.tele.miss },
                          { label: t.avg, value: teamStats.tele.avg },
                          { label: t.success, value: teamStats.tele.ratio + '%' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-1">
                            <span className="font-black text-slate-900 text-[12px]">{item.label}</span>
                            <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <span className="block text-center text-[12px] font-black text-slate-400 uppercase">{t.auto}</span>
                        {[
                          { label: t.totalHits, value: teamStats.auto.total },
                          { label: t.totalMisses, value: teamStats.auto.miss },
                          { label: t.avg, value: teamStats.auto.avg },
                          { label: t.success, value: teamStats.auto.ratio + '%' },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-1">
                            <span className="font-black text-slate-900 text-[12px]">{item.label}</span>
                            <div className="bg-amber-100 border-2 border-slate-900 rounded-lg py-1 px-2 text-center font-black text-slate-900 flex-1 text-[12px]">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2rem] p-4 sm:p-8 min-h-[400px] flex flex-col text-slate-900 shadow-xl">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-bold">{t.loadingHistory}</p>
              </div>
            ) : searchTeam ? (
              <>
                {filteredData.length > 0 ? (
                  viewMode === 'graph' ? (
                  <div className="w-full h-[400px] relative">
                    <ResponsiveContainer width="99%" height={400}>
                      <LineChart data={filteredData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="game" stroke="#64748b" />
                        <YAxis 
                          yAxisId="primary" 
                          orientation="left" 
                          stroke="#64748b" 
                        />
                        {selectedInvestigationMetrics.includes('ratio') && (
                          <YAxis 
                            yAxisId="secondary" 
                            orientation="right" 
                            stroke="#64748b" 
                            unit="%"
                          />
                        )}
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                          itemStyle={{ fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="top" height={36}/>
                        
                        {/* Individual Lines */}
                        {selectedInvestigationMetrics.includes('hit') && (
                          <Line 
                            yAxisId="primary"
                            type="monotone" 
                            dataKey="hit" 
                            name={t.hit} 
                            stroke="#000" 
                            strokeWidth={3} 
                            dot={{ r: 6 }} 
                            activeDot={{ r: 8 }} 
                            isAnimationActive={false}
                          />
                        )}
                        {selectedInvestigationMetrics.includes('miss') && (
                          <Line 
                            yAxisId="primary"
                            type="monotone" 
                            dataKey="miss" 
                            name={t.miss} 
                            stroke="#ef4444" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                            isAnimationActive={false}
                          />
                        )}
                        {selectedInvestigationMetrics.includes('ratio') && (
                          <Line 
                            yAxisId="secondary"
                            type="monotone" 
                            dataKey="ratio" 
                            name={t.ratio} 
                            stroke="#8b5cf6" 
                            strokeWidth={2} 
                            strokeDasharray="5 5"
                            dot={{ r: 4 }} 
                            isAnimationActive={false}
                          />
                        )}

                        {/* Fouls Team */}
                        {selectedInvestigationMetrics.includes('fouls') && (
                          <>
                            <Line 
                              yAxisId="primary"
                              type="monotone" 
                              dataKey="fouls" 
                              name={t.fouls} 
                              stroke="#f59e0b" 
                              strokeWidth={3} 
                              dot={{ r: 6 }} 
                              isAnimationActive={false}
                            />
                            <Line 
                              yAxisId="primary"
                              type="monotone" 
                              dataKey="gateFoul" 
                              name={t.gateFoul} 
                              stroke="#ef4444" 
                              strokeWidth={1} 
                              strokeDasharray="3 3"
                              isAnimationActive={false}
                            />
                            <Line 
                              yAxisId="primary"
                              type="monotone" 
                              dataKey="parkFoul" 
                              name={t.parkFoul} 
                              stroke="#3b82f6" 
                              strokeWidth={1} 
                              strokeDasharray="3 3"
                              isAnimationActive={false}
                            />
                            <Line 
                              yAxisId="primary"
                              type="monotone" 
                              dataKey="intakeFoul" 
                              name={t.intakeFoul} 
                              stroke="#10b981" 
                              strokeWidth={1} 
                              strokeDasharray="3 3"
                              isAnimationActive={false}
                            />
                          </>
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.games}</th>
                          {isRTL ? (
                            <>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.intakeFoul}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.parkFoul}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.gateFoul}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.ratio}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.miss}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.hit}</th>
                            </>
                          ) : (
                            <>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.hit}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.miss}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.ratio}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.gateFoul}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.parkFoul}</th>
                              <th className="py-4 px-4 text-xs font-black uppercase tracking-widest text-slate-400 text-start">{t.intakeFoul}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-start">{row.game}</td>
                            {isRTL ? (
                              <>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.intakeFoul}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.parkFoul}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.gateFoul}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.ratio}%</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.miss}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.hit}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.hit}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.miss}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.ratio}%</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.gateFoul}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.parkFoul}</td>
                                <td className="py-4 px-4 font-bold text-slate-900 text-start">{row.intakeFoul}</td>
                              </>
                            )}
                          </tr>
                        ))}
                        {investigationTotals && (
                          <tr className="bg-slate-900 text-white font-black">
                            <td className="py-4 px-4 uppercase tracking-widest text-xs">{investigationTotals.game}</td>
                            {isRTL ? (
                              <>
                                <td className="py-4 px-4">{investigationTotals.intakeFoul}</td>
                                <td className="py-4 px-4">{investigationTotals.parkFoul}</td>
                                <td className="py-4 px-4">{investigationTotals.gateFoul}</td>
                                <td className="py-4 px-4">{investigationTotals.ratio}%</td>
                                <td className="py-4 px-4">{investigationTotals.miss}</td>
                                <td className="py-4 px-4">{investigationTotals.hit}</td>
                              </>
                            ) : (
                              <>
                                <td className="py-4 px-4">{investigationTotals.hit}</td>
                                <td className="py-4 px-4">{investigationTotals.miss}</td>
                                <td className="py-4 px-4">{investigationTotals.ratio}%</td>
                                <td className="py-4 px-4">{investigationTotals.gateFoul}</td>
                                <td className="py-4 px-4">{investigationTotals.parkFoul}</td>
                                <td className="py-4 px-4">{investigationTotals.intakeFoul}</td>
                              </>
                            )}
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                    <BarChart3 size={48} className="opacity-20" />
                    <p className="font-bold">{t.noData}</p>
                  </div>
                )}

                {/* Autonomous Table */}
                <div className="mt-12">
                  <h3 className="font-black uppercase tracking-[0.2em] text-xs text-rose-500 flex items-center gap-3 mb-6">
                    <div className="w-8 h-[2px] bg-rose-500" />
                    {t.autonomous}
                  </h3>
                  <div className="overflow-x-auto custom-scrollbar border-2 border-slate-100 rounded-2xl">
                    <table className="w-full text-start border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
                      <thead>
                        <tr className="bg-rose-900 text-white">
                          <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-rose-800">{t.match}</th>
                          <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-rose-800">{t.startPos}</th>
                          <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-rose-800">{t.scored}</th>
                          <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-rose-800">{t.missed}</th>
                          <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start">{t.leave}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => {
                          const raw = row.raw;
                          return (
                            <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                              <td className="py-4 px-6 font-bold text-slate-900 border-r border-slate-200">{raw.matchNumber}</td>
                              <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">
                                {raw.isAutoZoneBig ? t.bigTriangle : raw.isAutoZoneSmall ? t.smallTriangle : '-'}
                              </td>
                              <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{raw.autoBallHit}</td>
                              <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{raw.autoBallMiss}</td>
                              <td className="py-4 px-6 font-bold text-slate-700">{raw.isAutoLeave === true ? 'leave' : (isRTL ? 'לא' : 'No')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Remarks Section */}
                <h3 className="font-black uppercase tracking-[0.2em] text-xs text-indigo-400 flex items-center gap-3 mb-6 mt-12">
                  <div className="w-8 h-[2px] bg-indigo-500" />
                  {t.remarks}
                </h3>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-start border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="border-b-2 border-slate-800">
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 w-20 text-start">{t.games}#</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-start">{t.autoNotes}</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-slate-500 text-start">{t.teleComments}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row, idx) => (
                        (row.autoNotes || row.teleComments) ? (
                          <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                            <td className="py-4 px-4 font-black text-indigo-400 text-start">#{row.game}</td>
                            <td className="py-4 px-4 text-slate-300 font-medium text-sm leading-relaxed text-start">{row.autoNotes || '-'}</td>
                            <td className="py-4 px-4 text-slate-300 font-medium text-sm leading-relaxed text-start">{row.teleComments || '-'}</td>
                          </tr>
                        ) : null
                      ))}
                      {filteredData.every(row => !row.autoNotes && !row.teleComments) && (
                        <tr>
                          <td colSpan={3} className="py-12 text-center text-slate-500 font-bold">
                            {t.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Search size={48} className="opacity-20" />
                <p className="font-bold">{t.search}</p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] overflow-hidden flex flex-col text-slate-900 shadow-xl border-2 border-slate-100">
            {activeTab === 'compare' && (
              <>
                {/* Compare Teams Filter Bar */}
                <div className="p-4 sm:px-8 sm:pt-6 sm:pb-0 space-y-4">
                  {/* Performance sub-tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                    <button 
                      onClick={() => setCompareSubTab('ranking')}
                      className={`px-6 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${compareSubTab === 'ranking' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Trophy size={14} />
                      {t.teamRanking}
                    </button>
                    <button 
                      onClick={() => setCompareSubTab('performance')}
                      className={`px-6 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${compareSubTab === 'performance' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <BarChart3 size={14} />
                      {t.performanceCompare}
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm" dir="ltr">
                    <div className="flex-1 flex items-center gap-3" ref={compareTeamDropdownRef}>
                      <span className="text-slate-500 font-bold whitespace-nowrap">Teams:</span>
                      <div className="relative flex-1">
                        <button 
                          onClick={() => setIsCompareTeamDropdownOpen(!isCompareTeamDropdownOpen)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex items-center justify-between text-slate-900 font-bold hover:bg-slate-100 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isCompareTeamDropdownOpen ? 'rotate-180' : ''}`} />
                            <span>
                              {compareSelectedTeams.length === 0 
                                ? "Select Teams" 
                                : compareSelectedTeams.length === uniqueTeams.length 
                                  ? "All Teams" 
                                  : `${compareSelectedTeams.length} Teams Selected`}
                            </span>
                          </div>
                          <Search size={16} className="text-slate-400" />
                        </button>
                        {isCompareTeamDropdownOpen && (
                          <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Teams</span>
                              <button 
                                onClick={() => {
                                  if (compareSelectedTeams.length === uniqueTeams.length) {
                                    setCompareSelectedTeams([]);
                                  } else {
                                    setCompareSelectedTeams([...uniqueTeams]);
                                  }
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                              >
                                {compareSelectedTeams.length === uniqueTeams.length ? "Clear All" : "Select All"}
                              </button>
                            </div>
                            <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                              {uniqueTeams.map(team => (
                                <button
                                  key={team}
                                  onClick={() => {
                                    setCompareSelectedTeams(prev => 
                                      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
                                    );
                                  }}
                                  className={`w-full flex items-center justify-between p-3 hover:bg-slate-100 rounded-lg transition-colors group ${compareSelectedTeams.includes(team) ? 'bg-slate-50' : ''}`}
                                >
                                  <span className="font-bold text-slate-900">{team}</span>
                                  {compareSelectedTeams.includes(team) && <Check size={16} className="text-indigo-600" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-8 min-h-[400px]">
                  {compareSelectedTeams.length > 0 ? (
                    compareSubTab === 'ranking' ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-start border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
                        <thead>
                          <tr className="bg-emerald-900 text-white">
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{t.rank}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{t.teamNumber}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{isRTL ? 'משחקים' : 'Games'}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{t.grade}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{t.ratioTie}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-emerald-800">{t.avgAuto}</th>
                            <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start">{t.avgTele}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRankedTeams.map(team => {
                            const avgAuto = team.GAMES_COUNT > 0 ? (team.TOTAL_AUTONOMUS_HIT / team.GAMES_COUNT).toFixed(2) : '0.00';
                            const avgTele = team.GAMES_COUNT > 0 ? (team.TOTAL_TELEOP_HIT / team.GAMES_COUNT).toFixed(2) : '0.00';
                            return (
                              <tr key={team.TeamNumber} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6 font-black text-indigo-600 border-r border-slate-200">
                                  <div className="flex items-center gap-2">
                                    {team.rank <= 3 && <Trophy size={14} className={team.rank === 1 ? 'text-amber-400' : team.rank === 2 ? 'text-slate-400' : 'text-amber-700'} />}
                                    #{team.rank}
                                  </div>
                                </td>
                                <td 
                                  className="py-4 px-6 font-black text-slate-900 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                                  onDoubleClick={() => {
                                    setSelectedTeams([team.TeamNumber.toString()]);
                                    setActiveTab('investigation');
                                  }}
                                  title={isRTL ? "לחיצה כפולה לחקירת קבוצה זו" : "Double click to investigate this team"}
                                >
                                  {team.TeamNumber}
                                </td>
                                <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.GAMES_COUNT}</td>
                                <td className="py-4 px-6 font-black text-emerald-600 border-r border-slate-200">
                                  <button onClick={() => setSelectedGradeDetails(team)} className="hover:underline focus:outline-none">
                                    {team.grade}
                                  </button>
                                </td>
                                <td className="py-4 px-6 font-bold text-slate-500 border-r border-slate-200">{team.ratio}</td>
                                <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{avgAuto}</td>
                                <td className="py-4 px-6 font-bold text-slate-700">{avgTele}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    ) : (
                      viewMode === 'graph' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {[
                            { key: 'shooting', label: t.shootingCapabilitiesPct, unit: '%' },
                            { key: 'collection', label: t.collectionCapabilitiesPct, unit: '%' },
                            { key: 'scoring', label: t.scoring, unit: '' },
                            { key: 'fouls', label: t.fouls, unit: '' },
                            { key: 'behavior', label: t.behavior, unit: '%' },
                            { key: 'autonomous', label: t.autonomous, unit: '' }
                          ].map(metric => (
                            <div key={metric.key} className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-6 shadow-sm overflow-hidden">
                              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                {metric.label}
                              </h3>
                              <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={performanceComparisonData} layout="vertical" margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                      dataKey="team" 
                                      type="category" 
                                      stroke="#64748b" 
                                      fontSize={12} 
                                      fontWeight="bold" 
                                      width={60}
                                    />
                                    <Tooltip 
                                      content={<CustomPerformanceTooltip language={language} metricKey={metric.key} />}
                                      cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey={metric.key} radius={[0, 8, 8, 0]} barSize={24}>
                                      {performanceComparisonData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto border-2 border-slate-100 rounded-2xl">
                          <table className="w-full text-start border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
                            <thead>
                              <tr className="bg-indigo-900 text-white">
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.teamNumber}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.shootingCapabilitiesPct}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.collectionCapabilitiesPct}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.scoring}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.fouls}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start border-r border-indigo-800">{t.behavior}</th>
                                <th className="py-4 px-6 text-xs font-black uppercase tracking-widest text-start">{t.autonomous}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {performanceComparisonData.map(team => (
                                <tr key={team.team} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                  <td 
                                    className="py-4 px-6 font-black text-slate-900 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                                    onDoubleClick={() => {
                                      setSelectedTeams([team.team.toString()]);
                                      setActiveTab('investigation');
                                    }}
                                    title={isRTL ? "לחיצה כפולה לחקירת קבוצה זו" : "Double click to investigate this team"}
                                  >
                                    {team.team}
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600 border-r border-slate-200">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'shooting', data: team})} className="hover:underline focus:outline-none">
                                      {team.shooting}%
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600 border-r border-slate-200">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'collection', data: team})} className="hover:underline focus:outline-none">
                                      {team.collection}%
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600 border-r border-slate-200">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'scoring', data: team})} className="hover:underline focus:outline-none">
                                      {team.scoring}
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600 border-r border-slate-200">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'fouls', data: team})} className="hover:underline focus:outline-none">
                                      {team.fouls}
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600 border-r border-slate-200">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'behavior', data: team})} className="hover:underline focus:outline-none">
                                      {team.behavior}%
                                    </button>
                                  </td>
                                  <td className="py-4 px-6 font-bold text-emerald-600">
                                    <button onClick={() => setSelectedPerformanceDetails({team: team.team, category: 'autonomous', data: team})} className="hover:underline focus:outline-none">
                                      {team.autonomous}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    )
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                      <BarChart3 size={48} className="opacity-20" />
                      <p className="font-bold">{t.selectTeamsPrompt}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'game' && (
              <div className="p-4 sm:p-8 min-h-[400px] space-y-6">
                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg" dir="ltr">
                  {/* Team Filter */}
                  <div className="flex-1 flex items-center gap-3" ref={gameTeamDropdownRef}>
                    <span className="text-slate-400 font-bold whitespace-nowrap">Team:</span>
                    <div className="relative flex-1">
                      <button 
                        onClick={() => setIsGameTeamDropdownOpen(!isGameTeamDropdownOpen)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 flex items-center justify-between text-white font-bold hover:bg-slate-700 transition-all"
                      >
                        <span>{gameViewTeam || "Select Team"}</span>
                        <ChevronDown size={16} className={`transition-transform ${isGameTeamDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isGameTeamDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                            {uniqueTeams.map(team => (
                              <button 
                                key={team}
                                onClick={() => {
                                  setGameViewTeam(team);
                                  setIsGameTeamDropdownOpen(false);
                                  // Auto-select the first match for this team
                                  const teamMatches = history
                                    .filter(r => r.teamScouted?.toString() === team)
                                    .map(r => (r.matchNumber || r.gameNumber || '').toString().trim())
                                    .filter(m => !!m);
                                  if (teamMatches.length > 0) {
                                    setGameViewMatch(teamMatches[0]);
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors ${gameViewTeam === team ? 'bg-indigo-600' : ''}`}
                              >
                                <span className="font-bold text-white">{team}</span>
                                {gameViewTeam === team && <Check size={14} className="text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Game# Filter */}
                  <div className="flex-1 flex items-center gap-3" ref={gameMatchDropdownRef}>
                    <span className="text-slate-400 font-bold whitespace-nowrap">Game#:</span>
                    <div className="relative flex-1">
                      <button 
                        onClick={() => setIsGameMatchDropdownOpen(!isGameMatchDropdownOpen)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 flex items-center justify-between text-white font-bold hover:bg-slate-700 transition-all"
                      >
                        <span>{gameViewMatch || "Select Match"}</span>
                        <ChevronDown size={16} className={`transition-transform ${isGameMatchDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isGameMatchDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                            {uniqueMatches
                              .filter(match => history.some(r => (r.matchNumber || r.gameNumber || '').toString().trim() === match && r.teamScouted?.toString() === gameViewTeam))
                              .map(match => (
                              <button 
                                key={match}
                                onClick={() => {
                                  setPrevGameViewMatch(gameViewMatch);
                                  setGameViewMatch(match);
                                  setGameViewError(null);
                                  setIsGameMatchDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-2 hover:bg-slate-700 rounded-lg transition-colors ${gameViewMatch === match ? 'bg-indigo-600' : ''}`}
                              >
                                <span className="font-bold text-white">{match}</span>
                                {gameViewMatch === match && <Check size={14} className="text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {gameViewError ? (
                  <div className="bg-rose-900/20 border-2 border-rose-500/50 rounded-2xl p-8 text-center space-y-4">
                    <X size={48} className="mx-auto text-rose-500" />
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">{isRTL ? 'שגיאה בתצוגת המשחק' : 'Game View Error'}</h3>
                    <p className="text-slate-400 font-bold max-w-md mx-auto">
                      {gameViewError}
                    </p>
                    <button 
                      onClick={() => {
                        setGameViewMatch(prevGameViewMatch);
                        setGameViewError(null);
                      }}
                      className="bg-white text-slate-900 px-6 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      {isRTL ? 'חזור לבחירה קודמת' : 'Revert to Previous'}
                    </button>
                  </div>
                ) : (
                  <>
                    {(() => {
                      try {
                        const matchRows = history.filter(r => {
                          const mNum = (r.matchNumber || r.gameNumber || '').toString().trim();
                          return mNum === (gameViewMatch || '').trim();
                        });

                        if (matchRows.length === 0 && gameViewMatch) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                              <BarChart3 size={48} className="opacity-20" />
                              <p className="font-bold">{isRTL ? 'אין נתונים למקצה זה' : 'No data for this match'}</p>
                            </div>
                          );
                        }

                        const sortedMatchRows = [...matchRows].sort((a, b) => {
                          if (a.allianceColor === b.allianceColor) {
                            return String(a.teamScouted || '').localeCompare(String(b.teamScouted || ''));
                          }
                          return a.allianceColor === 'Red' ? -1 : 1;
                        });

                        return (
                          <>
                            {/* Table */}
                            <div className="w-full overflow-x-auto border-2 border-black rounded-2xl">
                              <table className="w-full border-collapse bg-white text-black font-bold text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                                <thead>
                                  <tr className="border-b-2 border-black">
                                    <th 
                                      className="p-2 bg-[#f3e8ff] border-e-2 border-black w-40 text-xs text-start cursor-pointer hover:bg-violet-100 select-none transition-colors"
                                      onDoubleClick={() => {
                                        const matchTeams = sortedMatchRows
                                          .map(row => row.teamScouted?.toString().trim())
                                          .filter((num): num is string => !!num);
                                        setCompareSelectedTeams(matchTeams);
                                        setActiveTab('compare');
                                      }}
                                      title={isRTL ? "לחיצה כפולה להשוואת קבוצות ממקצה זה" : "Double-click to compare teams in this match"}
                                    >
                                      Heat Number
                                    </th>
                                    <th 
                                      colSpan={Math.max(1, sortedMatchRows.length)} 
                                      className="p-2 text-center text-lg font-black cursor-pointer hover:bg-indigo-50/50 select-none transition-colors"
                                      onDoubleClick={() => {
                                        const matchTeams = sortedMatchRows
                                          .map(row => row.teamScouted?.toString().trim())
                                          .filter((num): num is string => !!num);
                                        setCompareSelectedTeams(matchTeams);
                                        setActiveTab('compare');
                                      }}
                                      title={isRTL ? "לחיצה כפולה להשוואת קבוצות ממקצה זה" : "Double-click to compare teams in this match"}
                                    >
                                      {t.match} {gameViewMatch}
                                    </th>
                                  </tr>
                                  <tr className="border-b-2 border-black">
                                    <th className="p-2 bg-[#f3e8ff] border-e-2 border-black text-xs text-start">Team</th>
                                    {sortedMatchRows.map((row, i) => {
                                      const alliance = row.allianceColor || 'Red';
                                      const color = alliance === 'Red' ? 'text-red-600' : 'text-blue-600';
                                      const bgColor = alliance === 'Red' ? 'bg-red-50/50' : 'bg-blue-50/50';
                                      const teamNum = row.teamScouted || '---';
                                      
                                      return (
                                        <th key={i} className={`p-2 text-center border-e-2 border-black last:border-e-0 text-base font-black ${color} ${bgColor}`}>
                                          <div className="flex flex-col">
                                            <span className="text-lg">{teamNum}</span>
                                            <span className="text-[10px] font-bold opacity-80 uppercase tracking-tighter">{alliance}</span>
                                          </div>
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* Data Rows */}
                                  {[
                                    { label: isRTL ? 'עזיבה באוטונומי' : 'Auto Leave', type: 'auto_leave' },
                                    { label: t.scoringAuto, type: 'auto_scoring' },
                                    { label: t.generalHits, type: 'general_hits' },
                                    { label: t.fouls, type: 'fouls' },
                                    { label: t.parkingType, type: 'parking' },
                                    { label: t.shootingRange, type: 'shooting' },
                                    { label: t.collectionCapabilities, type: 'collection' }
                                  ].map((rowDef, rowIdx) => (
                                    <tr key={rowIdx} className="border-b-2 border-black last:border-b-0">
                                      <td className="p-2 bg-[#f3e8ff] border-e-2 border-black text-xs text-start">{rowDef.label}</td>
                                      {sortedMatchRows.map((row, i) => {
                                        const alliance = row.allianceColor || 'Red';
                                        const bgColor = alliance === 'Red' ? 'bg-red-50/20' : 'bg-blue-50/20';
                                        
                                        const CheckIcon = ({ checked, label }: { checked: boolean, label?: string }) => (
                                          <div className="flex items-center gap-1">
                                            <div className={`w-3 h-3 border border-black flex items-center justify-center ${checked ? 'bg-black' : 'bg-white'}`}>
                                            </div>
                                            {label && <span className="text-[9px] font-bold whitespace-nowrap">{label}</span>}
                                          </div>
                                        );

                                        let displayValue: React.ReactNode = '-';
                                        if (rowDef.type === 'auto_leave') {
                                          displayValue = <div className="flex justify-center"><CheckIcon checked={row.isAutoLeave === true} /></div>;
                                        } else if (rowDef.type === 'auto_scoring') {
                                          displayValue = row.autoBallHit || '0';
                                        } else if (rowDef.type === 'general_hits') {
                                          displayValue = (row.autoBallHit || 0) + (row.teleBallHit || 0);
                                        } else if (rowDef.type === 'fouls') {
                                          displayValue = (
                                            <div className="flex flex-col gap-0.5 items-start">
                                              <CheckIcon checked={row.teleGateFoul === true} label={t.foulGate} />
                                              <CheckIcon checked={row.teleIntakeFoul === true} label={t.foulIntake} />
                                              <CheckIcon checked={row.teleParkingFoul === true} label={t.foulPark} />
                                            </div>
                                          );
                                        } else if (rowDef.type === 'parking') {
                                          const isElevator = row.teleParkingFoul;
                                          displayValue = isElevator ? (isRTL ? 'מעלית' : 'Elevator') : (isRTL ? 'לא מעלית' : 'No Elevator');
                                        } else if (rowDef.type === 'shooting') {
                                          const isNear = row.isAutoZoneSmall || row.isTeleopZoneSmall;
                                          const isFar = row.isAutoZoneBig || row.isTeleopZoneBig;
                                          displayValue = (
                                            <div className="flex flex-col gap-0.5 items-start">
                                              <CheckIcon checked={!!isNear} label={t.shootingNear} />
                                              <CheckIcon checked={!!isFar} label={t.shootingFar} />
                                            </div>
                                          );
                                        } else if (rowDef.type === 'collection') {
                                          displayValue = (
                                            <div className="flex flex-col gap-0.5 items-start">
                                              <CheckIcon checked={row.teleFloor === true} label={t.collectionFloor} />
                                              <CheckIcon checked={row.teleHumanPlayer === true} label={t.collectionHuman} />
                                              <CheckIcon checked={row.autoIntakeUsed === true} label={t.collectionAuto} />
                                            </div>
                                          );
                                        }

                                        return (
                                          <td key={i} className={`p-2 text-center border-e-2 border-black last:border-e-0 font-bold ${bgColor}`}>
                                            {displayValue}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      } catch (err) {
                        console.error("Error rendering game view:", err);
                        setGameViewError(isRTL ? 'אירעה שגיאה בעיבוד נתוני המשחק' : 'An error occurred while processing game data');
                        return null;
                      }
                    })()}
                  </>
                )}
              </div>
            )}
      </div>

      {(activeTab as string) === 'config' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header & Help button */}
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Sliders className="text-indigo-600" />
                {isRTL ? 'הגדרות חישוב ציונים' : 'Grades Configuration'}
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {isRTL 
                  ? 'הגדרת המשקלים היחסיים ונקודות הזכות עבור כלל הקבוצות המשתתפות' 
                  : 'Manage relative weights and values for team overall scoring engine'}
              </p>
            </div>
            
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-2 border-indigo-600 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-[4px_4px_0px_0px_rgba(79,70,229,0.2)]"
            >
              <HelpCircle size={15} />
              {isRTL ? 'עזרה והסברים' : 'Methodology Help'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle Column: Weights Sliders & Raw Table */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Sliders Card */}
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-lg font-black text-slate-900 mb-6 border-b-2 border-slate-100 pb-3 flex items-center gap-2">
                  <Sliders size={18} className="text-indigo-600" />
                  {isRTL ? 'כוון משקלי פרמטרים' : 'Adjust Relative Weights (-100 to 100)'}
                </h3>
                
                <div className="space-y-6">
                  {/* Weight Auto Hit */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'פגיעות אוטונומי (POINTS_AUTO_HIT)' : 'Auto Hits Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_AUTO_HIT}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_AUTO_HIT}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_HIT: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Tele Hit */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'פגיעות טלאופ (POINTS_TELEOP_HIT)' : 'Teleop Hits Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_TELEOP_HIT}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_TELEOP_HIT}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_HIT: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Parking */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'חנייה (POINTS_PARKING)' : 'Parking Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_PARKING}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-950 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_PARKING}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_PARKING: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Auto Miss */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'החטאות אוטונומי (POINTS_AUTO_MISS)' : 'Auto Miss Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_AUTO_MISS}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_AUTO_MISS}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_AUTO_MISS: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Tele Miss */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'החטאות טלאופ (POINTS_TELEOP_MISS)' : 'Teleop Miss Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_TELEOP_MISS}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_TELEOP_MISS}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_TELEOP_MISS: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Fouls - Gate */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'עבירת שער (POINTS_FOUL_GATE)' : 'Gate Foul Penalty'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_FOUL_GATE}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_GATE: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_FOUL_GATE}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_GATE: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Fouls - Parking */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'עבירת חנייה (POINTS_FOUL_PARKING)' : 'Parking Foul Penalty'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_FOUL_PARKING}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_PARKING: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_FOUL_PARKING}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_PARKING: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Fouls - Intake */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'עבירת אינטייק (POINTS_FOUL_INTAKE)' : 'Intake Foul Penalty'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_FOUL_INTAKE}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_INTAKE: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_FOUL_INTAKE}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FOUL_INTAKE: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  {/* Weight Fouls - Fallback */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase text-slate-700">
                      <span>{isRTL ? 'עבירות כללי / גיבוי (POINTS_FAUL)' : 'General / Fallback Foul Weight'}</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="-100" 
                          max="100" 
                          value={sliderWeights.POINTS_FAUL}
                          onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                          className="w-14 text-center px-1.5 py-0.5 border-2 border-slate-900 rounded-md font-mono font-bold"
                        />
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-100" 
                      max="100" dir="ltr"
                      value={sliderWeights.POINTS_FAUL}
                      onChange={(e) => setSliderWeights({ ...sliderWeights, POINTS_FAUL: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-8 pt-6 border-t-2 border-slate-100 justify-end">
                  <button
                    onClick={handleCancelWeights}
                    className="px-4 py-2 border-2 border-slate-500 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    onClick={runSimulation}
                    className="px-4 py-2 border-2 border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    {isRTL ? 'סימולציה מחדש' : 'Simulate'}
                  </button>
                  <button
                    onClick={handleSaveWeights}
                    disabled={isSavingWeights}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-[4px_4px_0px_0px_rgba(225,29,72,0.3)]"
                  >
                    {isSavingWeights ? (isRTL ? 'שומר...' : 'Saving...') : (isRTL ? 'שמור משקלים' : 'Save Weights')}
                  </button>
                </div>
              </div>

              {/* Table Card - Current Raw totals ONLY (No final Grade or Rank displayed yet!) */}
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-lg font-black text-slate-900 mb-4 border-b-2 border-slate-100 pb-3">
                  {isRTL ? 'נתוני יסוד קבוצתיים (ללא חישוב ציון)' : 'Baseline Team Stats (No calculated grade/rank yet)'}
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b-2 border-slate-950 font-black text-slate-800 text-[10px] uppercase">
                        <th className="px-3 py-2 text-start">{isRTL ? 'קבוצה' : 'Team'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'משחקים' : 'Games'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'פגיעות אוטונומי' : 'Auto Hits'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'פגיעות טלאופ' : 'Teleop Hits'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'החטאות אוטונומי' : 'Auto Miss'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'החטאות טלאופ' : 'Teleop Miss'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'חניות מלאות' : 'Full Park'}</th>
                        <th className="px-3 py-2 text-center">{isRTL ? 'עבירות' : 'Fouls'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teamsGrades.map((team) => (
                        <tr key={team.TeamNumber} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-black text-slate-900">{team.TeamNumber}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-slate-600">{team.GAMES_COUNT}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-600">{(team.TOTAL_AUTONOMUS_HIT / team.GAMES_COUNT).toFixed(1)}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-600">{(team.TOTAL_TELEOP_HIT / team.GAMES_COUNT).toFixed(1)}</td>
                          <td className="px-3 py-2 text-center font-mono text-rose-600">{(team.TOTAL_AUTONOMUS_MISS / team.GAMES_COUNT).toFixed(1)}</td>
                          <td className="px-3 py-2 text-center font-mono text-rose-600">{(team.TOTAL_TELEOP_MISS / team.GAMES_COUNT).toFixed(1)}</td>
                          <td className="px-3 py-2 text-center font-mono text-blue-600">{(team.TOTAL_IS_FULL_PARKING / team.GAMES_COUNT).toFixed(1)}</td>
                          <td className="px-3 py-2 text-center font-mono text-amber-600">{(team.TOTAL_FOULS / team.GAMES_COUNT).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Suggested Simulated Grades Outcomes Checklist */}
            <div className="lg:col-span-1 space-y-8">
              
              <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="border-b-2 border-slate-100 pb-3 mb-4">
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">{isRTL ? 'תצוגה מקדימה דינמית' : 'Dynamic Preview'}</span>
                  <h3 className="text-lg font-black text-slate-900">
                    {isRTL ? 'דירוג וציונים מוצעים' : 'Suggested Simulated Grades'}
                  </h3>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {simulatedGrades.map((sim, index) => {
                    const actualGrade = teamsGrades.find(t => t.TeamNumber === sim.TeamNumber);
                    const diffGrade = actualGrade ? (sim.GRADE - actualGrade.GRADE) : 0;
                    const diffRank = actualGrade ? (actualGrade.RANK - sim.RANK) : 0;

                    return (
                      <div 
                        key={sim.TeamNumber} 
                        className="bg-slate-50 border-2 border-slate-200 hover:border-slate-900 rounded-2xl p-4 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-black">
                              {sim.RANK}
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {isRTL ? 'קבוצה' : 'Team'} {sim.TeamNumber}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-lg font-black text-emerald-600 font-mono">
                              {sim.GRADE}
                            </span>
                          </div>
                        </div>

                        {/* Comparative stats to show weight changes impact */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 pt-2 border-t border-slate-100">
                          {actualGrade ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span>{isRTL ? 'קודם:' : 'Previous:'}</span>
                                <span className="font-mono">{actualGrade.GRADE}</span>
                                {diffGrade !== 0 && (
                                  <span className={`font-mono font-black ${diffGrade > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    ({diffGrade > 0 ? `+${diffGrade.toFixed(1)}` : diffGrade.toFixed(1)})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span>{isRTL ? 'שינוי דירוג:' : 'Rank Shift:'}</span>
                                {diffRank === 0 ? (
                                  <span className="text-slate-400 font-mono">0</span>
                                ) : (
                                  <span className={`font-mono font-black ${diffRank > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {diffRank > 0 ? `▲ +${diffRank}` : `▼ ${diffRank}`}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <span>{isRTL ? 'חדש' : 'New'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Help methodology and guidelines popup dialog */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[85vh] border-2 border-slate-900">
            <div className="bg-indigo-950 px-6 py-4 flex items-center justify-between border-b-4 border-indigo-900">
              <h3 className="font-black text-white text-lg tracking-wide uppercase flex items-center gap-2">
                <HelpCircle className="text-indigo-400" />
                {language === Language.HE ? 'מתודולוגיית חישוב והגדרות' : 'Grading Standards & Methodology'}
              </h3>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-white hover:text-indigo-200 transition-colors bg-indigo-900 p-2 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm leading-relaxed" dir={language === Language.HE ? 'rtl' : 'ltr'}>
              <h4 className="font-black text-slate-800 text-base">{language === Language.HE ? 'נוסחת החישוב היסודית' : 'Primary Mathematical Formula'}</h4>
              <p className="bg-indigo-50 border border-indigo-150 p-3 rounded-xl font-mono text-[11px] text-indigo-900 font-bold leading-relaxed text-center">
                Grade = (AvgAutoHit × WEIGHT_AUTO_HIT) + (AvgTeleopHit × WEIGHT_TELEOP_HIT) + (AvgParking × WEIGHT_PARKING) <br/>
                + (AvgAutoMiss × WEIGHT_AUTO_MISS) + (AvgTeleopMiss × WEIGHT_TELEOP_MISS) + (AvgFouls × WEIGHT_FOULS)
              </p>
              
              <h4 className="font-black text-slate-800 text-base mt-4">{language === Language.HE ? 'הסבר על הפרמטרים' : 'Key Factor Descriptions'}</h4>
              <ul className="list-disc pl-5 pr-5 space-y-2">
                <li>
                  <strong>{language === Language.HE ? 'פגיעות אוטונומי/טלאופ:' : 'Autonomous/Teleop Hits:'}</strong>{' '}
                  {language === Language.HE ? 'מדד לקצב ורמת הדיוק הכללית של קליעת הרובוט באיזורים הייעודיים.' : 'Averages calculated based on successful secure attempts per game.'}
                </li>
                <li>
                  <strong>{language === Language.HE ? 'החטאות:' : 'Misses:'}</strong>{' '}
                  {language === Language.HE ? 'משמש כקנס ישיר המרתיע רובוטים שקצב קליעתם המעשית גולש להחטאות.' : 'Provides direct penalties scaling with failed shots.'}
                </li>
                <li>
                  <strong>{language === Language.HE ? 'חנייה מלאה:' : 'Parking:'}</strong>{' '}
                  {language === Language.HE ? 'נקודות קבע מיוחסות לזריקת חנייה באזורי הבונוס.' : 'Values computed corresponding to autonomous and final parking areas.'}
                </li>
                <li>
                  <strong>{language === Language.HE ? 'עבירות:' : 'Fouls:'}</strong>{' '}
                  {language === Language.HE ? 'נזק יחסי מצבר עונות פאולים מסוגי שער, איסוף וחנייה.' : 'Deductions calculated based on active game rules fouls.'}
                </li>
              </ul>

              <h4 className="font-black text-slate-800 text-base mt-4">{language === Language.HE ? 'מה קורה כשלוחצים שמירה?' : 'What Happens Upon Saving?'}</h4>
              <p>
                {language === Language.HE 
                  ? 'לחיצה על כפתור שמירה מאחסנת את המשקלים החדשים קבוע במסד הנתונים Supabase בטבלה ייעודית, ומיד מנקה את כל הציונים הקודמים ומחשבת את כל הציונים והדירוגים מחדש של הקבוצות בענן!'
                  : 'Saving writes configuration changes to Supabase instantly, clears outdated states, and triggers an exact full recalculation operation over the whole scouts registry.'}
              </p>
            </div>
            
            <div className="p-4 border-t-2 border-slate-100 bg-slate-50">
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl transition-colors"
              >
                {language === Language.HE ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Details Modal */}
      {selectedGradeDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-900 px-6 py-4 flex items-center justify-between border-b-4 border-emerald-800">
              <h3 className="font-black text-white text-lg tracking-wide uppercase">
                {language === Language.HE ? 'פירוט חישוב ציון' : 'Grade Details'} - {selectedGradeDetails.TeamNumber}
              </h3>
              <button 
                onClick={() => setSelectedGradeDetails(null)}
                className="text-white hover:text-emerald-200 transition-colors bg-emerald-800 p-2 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <div className="text-center">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">
                    {language === Language.HE ? 'ציון סופי' : 'Final Grade'}
                  </p>
                  <p className="text-5xl font-black text-emerald-600">
                    {selectedGradeDetails.grade}
                  </p>
                </div>
              </div>

              {selectedGradeDetails.gradeDetails ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 border-b-2 border-slate-100 pb-2 flex justify-between">
                    <span>{language === Language.HE ? 'רכיב' : 'Component'}</span>
                    <span>{language === Language.HE ? 'ממוצע (סה״כ / משחקים) × משקל' : 'Average (Total / Games) × Weight'}</span>
                  </h4>
                  
                  <div className="space-y-3 font-medium text-sm">
                    <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                      <span className="text-slate-700">{language === Language.HE ? 'פגיעות אוטונומי' : 'Auto Hits'}</span>
                      <span className="text-emerald-700 font-bold text-left" dir="ltr">
                        {selectedGradeDetails.gradeDetails.avgAutoHit.toFixed(2)} ({selectedGradeDetails.TOTAL_AUTONOMUS_HIT}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_AUTO_HIT} = +{(selectedGradeDetails.gradeDetails.avgAutoHit * selectedGradeDetails.gradeDetails.weights.POINTS_AUTO_HIT).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                      <span className="text-slate-700">{language === Language.HE ? 'פגיעות טלאופ' : 'Teleop Hits'}</span>
                      <span className="text-emerald-700 font-bold text-left" dir="ltr">
                        {selectedGradeDetails.gradeDetails.avgTeleopHit.toFixed(2)} ({selectedGradeDetails.TOTAL_TELEOP_HIT}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_TELEOP_HIT} = +{(selectedGradeDetails.gradeDetails.avgTeleopHit * selectedGradeDetails.gradeDetails.weights.POINTS_TELEOP_HIT).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <span className="text-slate-700">{language === Language.HE ? 'חניה' : 'Parking'}</span>
                      <span className="text-blue-700 font-bold text-left" dir="ltr">
                        {selectedGradeDetails.gradeDetails.avgParking.toFixed(2)} ({selectedGradeDetails.TOTAL_IS_FULL_PARKING}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_PARKING} = +{(selectedGradeDetails.gradeDetails.avgParking * selectedGradeDetails.gradeDetails.weights.POINTS_PARKING).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                      <span className="text-slate-700">{language === Language.HE ? 'החטאות אוטונומי' : 'Auto Misses'}</span>
                      <span className="text-red-700 font-bold text-left" dir="ltr">
                        {selectedGradeDetails.gradeDetails.avgAutoMiss.toFixed(2)} ({selectedGradeDetails.TOTAL_AUTONOMUS_MISS}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_AUTO_MISS} = {(selectedGradeDetails.gradeDetails.avgAutoMiss * selectedGradeDetails.gradeDetails.weights.POINTS_AUTO_MISS).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg border border-red-100">
                      <span className="text-slate-700">{language === Language.HE ? 'החטאות טלאופ' : 'Teleop Misses'}</span>
                      <span className="text-red-700 font-bold text-left" dir="ltr">
                        {selectedGradeDetails.gradeDetails.avgTeleopMiss.toFixed(2)} ({selectedGradeDetails.TOTAL_TELEOP_MISS}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_TELEOP_MISS} = {(selectedGradeDetails.gradeDetails.avgTeleopMiss * selectedGradeDetails.gradeDetails.weights.POINTS_TELEOP_MISS).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <span className="text-slate-700">{language === Language.HE ? 'עבירות שער' : 'Gate Fouls'}</span>
                      <span className="text-orange-700 font-bold text-left text-xs" dir="ltr">
                        {(selectedGradeDetails.gradeDetails.avgFoulGate || 0).toFixed(2)} ({selectedGradeDetails.TOTAL_GATE_FOULS || 0}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_GATE ?? -2} = {((selectedGradeDetails.gradeDetails.avgFoulGate || 0) * (selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_GATE ?? -2)).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <span className="text-slate-700">{language === Language.HE ? 'עבירות חנייה' : 'Parking Fouls'}</span>
                      <span className="text-orange-700 font-bold text-left text-xs" dir="ltr">
                        {(selectedGradeDetails.gradeDetails.avgFoulParking || 0).toFixed(2)} ({selectedGradeDetails.TOTAL_PARKING_FOULS || 0}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_PARKING ?? -2} = {((selectedGradeDetails.gradeDetails.avgFoulParking || 0) * (selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_PARKING ?? -2)).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <span className="text-slate-700">{language === Language.HE ? 'עבירות אינטייק' : 'Intake Fouls'}</span>
                      <span className="text-orange-700 font-bold text-left text-xs" dir="ltr">
                        {(selectedGradeDetails.gradeDetails.avgFoulIntake || 0).toFixed(2)} ({selectedGradeDetails.TOTAL_INTAKE_FOULS || 0}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_INTAKE ?? -2} = {((selectedGradeDetails.gradeDetails.avgFoulIntake || 0) * (selectedGradeDetails.gradeDetails.weights.POINTS_FOUL_INTAKE ?? -2)).toFixed(2)}
                      </span>
                    </div>

                    {(selectedGradeDetails.gradeDetails.weights.POINTS_FAUL !== 0 || selectedGradeDetails.TOTAL_FOULS > 0) && (
                      <div className="flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100 opacity-80">
                        <span className="text-slate-700">{language === Language.HE ? 'עבירות כללי' : 'General Fouls'}</span>
                        <span className="text-orange-700 font-bold text-left text-xs" dir="ltr">
                          {selectedGradeDetails.gradeDetails.avgFouls.toFixed(2)} ({selectedGradeDetails.TOTAL_FOULS}/{selectedGradeDetails.GAMES_COUNT}) × {selectedGradeDetails.gradeDetails.weights.POINTS_FAUL} = {(selectedGradeDetails.gradeDetails.avgFouls * selectedGradeDetails.gradeDetails.weights.POINTS_FAUL).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-4 font-medium">
                  {language === Language.HE ? 'לא נמצאו פרטים נוספים.' : 'No additional details found.'}
                </div>
              )}
            </div>
            <div className="p-4 border-t-2 border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedGradeDetails(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl transition-colors"
              >
                {language === Language.HE ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Details Modal */}
      {selectedPerformanceDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-900 px-6 py-4 flex items-center justify-between border-b-4 border-indigo-800">
              <h3 className="font-black text-white text-lg tracking-wide uppercase">
                {language === Language.HE ? 'פרטי חישוב' : 'Calculation Details'} - {selectedPerformanceDetails.team}
              </h3>
              <button 
                onClick={() => setSelectedPerformanceDetails(null)}
                className="text-white hover:text-indigo-200 transition-colors bg-indigo-800 p-2 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center justify-center py-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                <div className="text-center">
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-1">
                    {language === Language.HE ? 'ערך סופי' : 'Final Value'}
                  </p>
                  <p className="text-5xl font-black text-indigo-600">
                    {selectedPerformanceDetails.data[selectedPerformanceDetails.category]}
                    {['shooting', 'collection', 'behavior'].includes(selectedPerformanceDetails.category) ? '%' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 border-b-2 border-slate-100 pb-2">
                  {language === Language.HE ? 'הסבר חישוב' : 'Calculation Breakdown'}
                </h4>
                
                <div className="space-y-3 font-medium text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {selectedPerformanceDetails.category === 'shooting' && (
                    <>
                      <p><strong>{language === Language.HE ? 'סה״כ פגיעות' : 'Total Hits'}:</strong> {selectedPerformanceDetails.data.details.totalHits}</p>
                      <p><strong>{language === Language.HE ? 'סה״כ כדורים (פגיעות + החטאות)' : 'Total Balls (Hits + Misses)'}:</strong> {selectedPerformanceDetails.data.details.totalBalls}</p>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'פגיעות חלקי סך הכל כדורים כפול 100.' : 'Hits divided by total balls times 100.'}</em>
                      </p>
                    </>
                  )}
                  {selectedPerformanceDetails.category === 'collection' && (
                    <>
                      <p><strong>{language === Language.HE ? 'איסוף רצפה' : 'Floor Collection'}:</strong> {selectedPerformanceDetails.data.details.teleFloorCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p><strong>{language === Language.HE ? 'איסוף ידני' : 'Manual Collection'}:</strong> {selectedPerformanceDetails.data.details.teleHumanPlayerCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p><strong>{language === Language.HE ? 'איסוף אוטונומי' : 'Auto Collection'}:</strong> {selectedPerformanceDetails.data.details.autoIntakeCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <div className="pt-2 border-t border-slate-200 mt-2">
                        <p><strong>{language === Language.HE ? 'סה״כ איסוף' : 'Total Collection Actions'}:</strong> {selectedPerformanceDetails.data.details.collectionCount}</p>
                        <p><strong>{language === Language.HE ? 'פעולות אפשריות (סך משחקים כפול 3)' : 'Possible Actions (Total Games × 3)'}:</strong> {selectedPerformanceDetails.data.details.totalGames * 3}</p>
                      </div>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'אחוז איסוף מחשב את סך הפעמים בהם הקבוצה אספה מהרצפה, איסוף ידני או באוטונומי, חלקי סך ההזדמנויות האפשריות (3 לכל משחק).' : 'Collection percentage calculates the total times the team successfully collected from the floor, manually or via auto intake, divided by total possible opportunities (3 per game).'}</em>
                      </p>
                    </>
                  )}
                  {selectedPerformanceDetails.category === 'scoring' && (
                    <>
                      <p><strong>{language === Language.HE ? 'סה״כ פגיעות' : 'Total Hits'}:</strong> {selectedPerformanceDetails.data.details.totalHits}</p>
                      <p><strong>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</strong> {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'ממוצע פגיעות למשחק (סה״כ פגיעות חלקי סך משחקים).' : 'Average hits per game (Total hits divided by total games).'}</em>
                      </p>
                    </>
                  )}
                  {selectedPerformanceDetails.category === 'fouls' && (
                    <>
                      <p><strong>{language === Language.HE ? 'סה״כ עבירות' : 'Total Fouls'}:</strong> {selectedPerformanceDetails.data.details.fouls}</p>
                      <p><strong>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</strong> {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'ממוצע עבירות למשחק.' : 'Average fouls per game.'}</em>
                      </p>
                    </>
                  )}
                  {selectedPerformanceDetails.category === 'behavior' && (
                    <>
                      <p><strong>{language === Language.HE ? 'מודעות למגרש' : 'Field Awareness'}:</strong> {selectedPerformanceDetails.data.details.fieldAwarenessCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p><strong>{language === Language.HE ? 'הצלחה כללית' : 'Overall Success'}:</strong> {selectedPerformanceDetails.data.details.overallSuccessCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p><strong>{language === Language.HE ? 'פעולה עקבית/ללא בלבול' : 'Consistent Action/Not Confused'}:</strong> {selectedPerformanceDetails.data.details.notConfusedCount} / {selectedPerformanceDetails.data.details.totalGames}</p>
                      <div className="pt-2 border-t border-slate-200 mt-2">
                        <p><strong>{language === Language.HE ? 'סה״כ נקודות התנהגות' : 'Total Behavior Points'}:</strong> {selectedPerformanceDetails.data.details.behaviorScore}</p>
                        <p><strong>{language === Language.HE ? 'נקודות אפשריות (סך משחקים כפול 3)' : 'Possible Points (Total Games × 3)'}:</strong> {selectedPerformanceDetails.data.details.totalGames * 3}</p>
                      </div>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'אחוז התנהגות מחשב את סך הפעמים בו הקבוצה הפגינה מודעות למגרש, הצלחה כללית, ופעולה ללא בלבול, חלקי סך ההזדמנויות האפשריות (3 לכל משחק).' : 'Behavior percentage calculates the total times the team showed field awareness, overall success, and steady action, divided by total possible opportunities (3 per game).'}</em>
                      </p>
                    </>
                  )}
                  {selectedPerformanceDetails.category === 'autonomous' && (
                    <>
                      <p><strong>{language === Language.HE ? 'פגיעות באוטונומי' : 'Auto Hits'}:</strong> {selectedPerformanceDetails.data.details.autoHits}</p>
                      <p><strong>{language === Language.HE ? 'סך משחקים' : 'Total Games'}:</strong> {selectedPerformanceDetails.data.details.totalGames}</p>
                      <p className="pt-2 border-t border-slate-200 mt-2">
                        <em>{language === Language.HE ? 'ממוצע פגיעות באוטונומי למשחק.' : 'Average autonomous hits per game.'}</em>
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t-2 border-slate-100 bg-slate-50">
              <button 
                onClick={() => setSelectedPerformanceDetails(null)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl transition-colors"
              >
                {language === Language.HE ? 'סגור' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
