import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { Search, Table as TableIcon, BarChart3, LineChart as LineChartIcon, ArrowLeft, ChevronDown, Check, X, Trophy, RefreshCw, ScrollText, History, AlertCircle, Clock, LayoutGrid, Database } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'investigation' | 'compare' | 'game' | 'logs'>('investigation');
  const [compareSubTab, setCompareSubTab] = useState<'ranking' | 'performance'>('ranking');
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [isMatchDropdownOpen, setIsMatchDropdownOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

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

  const uniqueTeams = useMemo(() => {
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
  }, [history, teamsGrades]);

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
      stats.foulTotal += (row.teleFoulCount || 0);
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
          fouls: row.teleFoulCount || 0,
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
      const { grade, ratio } = calculateTeamGrade(teamData);
      return {
        ...teamData,
        grade,
        ratio
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

  const performanceComparisonData = useMemo(() => {
    if (compareSelectedTeams.length === 0) return [];
    
    return compareSelectedTeams.map((teamNum, idx) => {
      const teamRows = history.filter(r => r.recordType === 'MATCH_COMPLETE' && r.teamScouted?.toString() === teamNum);
      const totalGames = teamRows.length;
      
      if (totalGames === 0) {
        return {
          team: teamNum,
          shooting: 0,
          collection: 0,
          scoring: 0,
          fouls: 0,
          behavior: 0,
          autonomous: 0,
          color: COLORS[idx % COLORS.length]
        };
      }

      let totalHits = 0;
      let totalMisses = 0;
      let autoHits = 0;
      let fouls = 0;
      let behaviorScore = 0;
      let collectionCount = 0;

      teamRows.forEach(r => {
        const h = (r.autoBallHit || 0) + (r.teleBallHit || 0);
        const m = (r.autoBallMiss || 0) + (r.teleBallMiss || 0);
        totalHits += h;
        totalMisses += m;
        autoHits += (r.autoBallHit || 0);
        fouls += (r.teleFoulCount || 0);
        
        // Behavioral proxy
        if (r.teleFieldAwareness) behaviorScore++;
        if (r.teleOverallSuccess) behaviorScore++;
        if (!r.teleConfused) behaviorScore++;
        
        // Collection proxy
        if (r.teleFloor || r.teleHumanPlayer || r.autoIntakeUsed) collectionCount++;
      });

      const totalBalls = totalHits + totalMisses;
      
      return {
        team: teamNum,
        shooting: totalBalls > 0 ? Math.round((totalHits / totalBalls) * 100) : 0,
        collection: Math.round((collectionCount / totalGames) * 100),
        scoring: Math.round(totalHits / totalGames), // Avg hits per game
        fouls: Math.round((fouls / totalGames) * 10) / 10, // Avg fouls per game
        behavior: Math.round((behaviorScore / (totalGames * 3)) * 100), // Pct of possible positive behaviors
        autonomous: Math.round((autoHits / totalGames) * 10) / 10, // Avg auto hits
        color: COLORS[idx % COLORS.length]
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
              <button 
                onClick={() => setActiveTab('logs')}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'logs' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {t.processLogs}
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
                                <td className="py-4 px-6 font-black text-slate-900 border-r border-slate-200">{team.TeamNumber}</td>
                                <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.GAMES_COUNT}</td>
                                <td className="py-4 px-6 font-black text-emerald-600 border-r border-slate-200">{team.grade}</td>
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
                                      cursor={{ fill: 'transparent' }}
                                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                      formatter={(value) => [`${value}${metric.unit}`, metric.label]}
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
                                  <td className="py-4 px-6 font-black text-slate-900 border-r border-slate-200">{team.team}</td>
                                  <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.shooting}%</td>
                                  <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.collection}%</td>
                                  <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.scoring}</td>
                                  <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.fouls}</td>
                                  <td className="py-4 px-6 font-bold text-slate-700 border-r border-slate-200">{team.behavior}%</td>
                                  <td className="py-4 px-6 font-bold text-slate-700">{team.autonomous}</td>
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
                                    <th className="p-2 bg-[#f3e8ff] border-e-2 border-black w-40 text-xs text-start">Heat Number</th>
                                    <th colSpan={Math.max(1, sortedMatchRows.length)} className="p-2 text-center text-lg font-black">{t.match} {gameViewMatch}</th>
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
                                    { label: isRTL ? 'עזיבה באוטונומי %' : 'Leave %', type: 'percentage' },
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
                                        
                                        const CheckIcon = ({ checked, label }: { checked: boolean, label: string }) => (
                                          <div className="flex items-center gap-1">
                                            <div className={`w-3 h-3 border border-black flex items-center justify-center ${checked ? 'bg-black' : 'bg-white'}`}>
                                              {checked && <div className="w-1.5 h-1.5 bg-white" />}
                                            </div>
                                            <span className="text-[9px] font-bold whitespace-nowrap">{label}</span>
                                          </div>
                                        );

                                        let displayValue: React.ReactNode = '-';
                                        if (rowDef.type === 'percentage') {
                                          displayValue = row.isAutoLeave === true ? '100%' : '0%';
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

                            {/* Summary Panel */}
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg" dir="ltr">
                              <h3 className="text-white font-black uppercase tracking-widest mb-4">Alliance Performance Summary:</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <h4 className="text-red-500 font-bold uppercase text-sm tracking-widest">Red Alliance</h4>
                                  <ul className="space-y-1 text-slate-300 text-sm">
                                    {matchRows
                                      .filter(r => r.allianceColor === 'Red')
                                      .map((r, idx) => (
                                        <li key={`${r.teamScouted}-${idx}`} className="flex items-center gap-2">
                                          <div className="w-1 h-1 bg-red-500 rounded-full" />
                                          <span>Team {r.teamScouted}</span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="text-blue-500 font-bold uppercase text-sm tracking-widest">Blue Alliance</h4>
                                  <ul className="space-y-1 text-slate-300 text-sm">
                                    {matchRows
                                      .filter(r => r.allianceColor === 'Blue')
                                      .map((r, idx) => (
                                        <li key={`${r.teamScouted}-${idx}`} className="flex items-center gap-2">
                                          <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                          <span>Team {r.teamScouted}</span>
                                        </li>
                                      ))}
                                  </ul>
                                </div>
                              </div>
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
      {activeTab === 'logs' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white border-2 border-slate-900 rounded-[2rem] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t.processLogs}</h2>
                  <p className="text-xs text-slate-500 font-bold">{isRTL ? 'מעקב בזמן אמת אחר עיבודי מערכת אוטומטיים' : 'Real-time tracking of automatic system processing'}</p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-xl flex items-center gap-4 border-2 ${autoCalcActive ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${autoCalcActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-black uppercase tracking-widest">
                    {isRTL 
                      ? (autoCalcActive ? 'חישוב אוטומטי פעיל' : 'חישוב אוטומטי כבוי') 
                      : (autoCalcActive ? 'Auto-Calc Active' : 'Auto-Calc Inactive')}
                  </span>
                  {autoCalcActive && secondsRemaining !== null && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <Clock size={10} />
                      {isRTL ? `ריצה הבאה: ${secondsRemaining} ש'` : `Next Run: ${secondsRemaining}s`}
                    </span>
                  )}
                  <button 
                    onClick={() => onUpdateSettings({ isAutoCalcActive: !autoCalcActive })}
                    className="ml-2 hover:underline font-bold text-[10px] text-slate-600"
                  >
                    {isRTL 
                      ? (autoCalcActive ? '(הפסק)' : '(הפעל)') 
                      : (autoCalcActive ? '(Disable)' : '(Enable)')}
                  </button>
                </div>
                
                <div className="w-px h-4 bg-slate-300" />

                <button
                  onClick={async () => {
                    if (isClearing) return;
                    setIsClearing(true);
                    try {
                      const res = await fetch('/api/trigger-calc', { method: 'POST' });
                      if (res.ok) {
                        // Refresh logs immediately
                        const logsRes = await fetch('/api/process-logs');
                        if (logsRes.ok) setLogs(await logsRes.json());
                        alert(isRTL ? 'חישוב הושלם בהצלחה' : 'Calculation completed');
                      } else {
                        alert(isRTL ? 'שגיאה בחישוב' : 'Calculation failed');
                      }
                    } catch (e) {
                      alert(isRTL ? 'שגיאה בתקשורת' : 'Connection error');
                    } finally {
                      setIsClearing(false);
                    }
                  }}
                  disabled={isClearing}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider hover:text-indigo-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={isClearing ? 'animate-spin' : ''} />
                  {isRTL ? 'חשב עכשיו' : 'Run Now'}
                </button>
              </div>
            </div>

            {diagResult && (
              <div className="mb-6 p-6 bg-slate-900 rounded-2xl border border-slate-700 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={18} className="text-indigo-400" />
                    {t.diagnosticsTitle}
                  </h3>
                  <button 
                    onClick={() => setDiagResult(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{t.diagnosticsStatus}</span>
                      <span className={`text-xs font-black uppercase tracking-widest px-2 py-1 rounded-md ${diagResult.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {diagResult.status === 'ok' ? t.diagnosticsHealthy : t.diagnosticsError}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-slate-800/50 rounded-xl">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{t.diagnosticsTarget}</span>
                      <span className="text-[10px] font-mono text-slate-300 break-all">{diagResult.supabase_target || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block">Table Health Check</span>
                    <div className="space-y-2">
                      {diagResult.database_health && Object.entries(diagResult.database_health).map(([table, status]: [string, any]) => (
                        <div key={table} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-400">{table}</span>
                          <span className={`font-black uppercase tracking-[0.05em] ${status === 'Healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {status === 'Healthy' ? t.diagnosticsHealthy : t.diagnosticsError}
                          </span>
                        </div>
                      ))}
                      {diagResult.error && (
                        <p className="text-rose-400 text-[10px] font-bold mt-2">{diagResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleRunDiagnostics}
                disabled={isDiagnosing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                <div className={isDiagnosing ? 'animate-spin' : ''}>
                  <RefreshCw size={14} />
                </div>
                {t.runDiagnostics}
              </button>

              <button
                onClick={onSeed}
                disabled={isSeeding}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                {isSeeding ? (
                   <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Database size={14} />
                )}
                {isRTL ? 'צור נתוני דוגמה' : 'Generate Samples'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="px-4 py-3 text-start font-black text-slate-900 uppercase tracking-widest text-[10px]">{t.logTimestamp}</th>
                    <th className="px-4 py-3 text-start font-black text-slate-900 uppercase tracking-widest text-[10px]">{t.rowTimestamp}</th>
                    <th className="px-4 py-3 text-start font-black text-slate-900 uppercase tracking-widest text-[10px]">{t.team}</th>
                    <th className="px-4 py-3 text-start font-black text-slate-900 uppercase tracking-widest text-[10px]">{t.action}</th>
                    <th className="px-4 py-3 text-start font-black text-slate-900 uppercase tracking-widest text-[10px]">{t.logDetails}</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b border-slate-200">
                  {isLoadingLogs && logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw size={24} className="animate-spin text-indigo-500" />
                          <span className="text-sm font-bold text-slate-400">{isRTL ? 'טוען יומנים...' : 'Loading logs...'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <History size={24} className="text-slate-300" />
                          <span className="text-sm font-bold text-slate-400">{isRTL ? 'אין יומנים זמינים' : 'No logs available'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={12} />
                            <span className="font-mono text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] text-slate-400">{log.rowTimestamp}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-black">{log.teamNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border-2 ${
                            log.action === 'updated' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-600' 
                              : log.action === 'skipped'
                              ? 'bg-red-50 text-red-600 border-red-600'
                              : 'bg-blue-50 text-blue-600 border-blue-600'
                          }`}>
                            {t[log.action as keyof typeof t] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[10px] font-bold text-slate-700 leading-snug">{log.details}</p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
