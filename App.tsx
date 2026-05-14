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
import { 
  ClipboardList, 
  Radio, 
  Cpu, 
  BarChart3,
  ArrowLeft,
  X,
  RefreshCw,
  Table as TableIcon
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
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

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

      // Poll settings for lastConsolidationTime and status every 30 seconds
      const pollInterval = setInterval(() => {
        fetchSettings();
      }, 30000);

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
    const confirmMsg = language === Language.HE 
      ? 'פעולה זו תיצור 18 רשומות דוגמה (6 לכל קבוצה: 15811, 15928, 25041) ותסנכרן אותן לגוגל שיטס. להמשיך?'
      : 'This will generate 18 test records (6 for each team: 15811, 15928, 25041) and sync them to Google Sheets. Continue?';
    
    if (!window.confirm(confirmMsg)) return;
    
    setSeedStatus('loading');
    setSeedError(null);
    const teams = ['15811', '15928', '25041'];
    const scouterNames = ['TestScouter1', 'TestScouter2', 'TestScouter3'];

    try {
      for (const team of teams) {
        for (let i = 1; i <= 6; i++) {
          const row = {
            sessionId: `seed-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toLocaleString(),
            sessionStartTime: new Date().toISOString(),
            sessionEndTime: new Date().toISOString(),
            name: scouterNames[Math.floor(Math.random() * scouterNames.length)],
            matchNumber: i.toString(),
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
            teleGateFoul: Math.random() > 0.9,
            teleParkingFoul: Math.random() > 0.9,
            teleIntakeFoul: Math.random() > 0.9,
            teleFoulCount: 0,
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
          await new Promise(r => setTimeout(r, 200));
        }
      }
      setSeedStatus('success');
      setTimeout(() => setSeedStatus('idle'), 3000);
      fetchHistory();
      fetchTeamsGrades();
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

  const checkDuplicate = (historyData: SpreadsheetRow[], team: string, match: string, name: string) => {
    const cleanTeam = String(team || '').trim();
    const cleanMatch = String(match || '').trim();
    const cleanName = String(name || '').trim().toLowerCase();

    return historyData.some(row => {
      const rowTeam = String(row.teamScouted || '').trim();
      const rowMatch = String(row.matchNumber || '').trim();
      const rowName = String(row.name || '').trim().toLowerCase();
      const rowRecordType = row['recordType'];
      
      // Only consider it a duplicate if it's a MATCH_COMPLETE record
      if (rowRecordType !== 'MATCH_COMPLETE') return false;

      return rowTeam === cleanTeam && 
             rowMatch === cleanMatch && 
             rowName === cleanName;
    });
  };

  React.useEffect(() => {
    // History and Settings will be fetched only when entering Management or Admin views
  }, []);

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
      timestamp: new Date().toLocaleString(),
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
      if (isUpdateMode) {
        const updatedUser = {
          ...userData,
          sessionId: user?.sessionId || generateGUID(),
          sessionStartTime: user?.sessionStartTime || Date.now()
        };
        setUser(updatedUser);
        
        // Update autoData and teleopData to match new metadata
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

                if (checkDuplicate(latestHistory, team, match, name)) {
                  const authT: any = language === Language.HE ? AuthTranslation_HE : AuthTranslation_EN;
                  const errorMsg = authT.duplicateError
                    .replace('{team}', team)
                    .replace('{match}', match)
                    .replace('{name}', name);
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
 
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-4 items-stretch">
              {/* Initialize Data Sheet Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Initialize Data Sheet</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  This will archive current <b>{SHEET_NAME}</b> and create a fresh database.
                </p>
                {initStatus === 'error' && initError && (
                  <p className="text-[10px] text-red-500 font-bold mb-4 line-clamp-2">{initError}</p>
                )}
                <button 
                  onClick={handleInitSheet}
                  disabled={initStatus === 'loading'}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto ${getButtonClass(initStatus)}`}
                >
                  {initStatus === 'loading' ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Initializing...</>
                  ) : 'Clean Database'}
                </button>
              </div>

              {/* Seed Data Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
                  <TableIcon size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{isRTL ? 'יצירת נתוני דוגמה' : 'Generate Sample Data'}</h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isRTL ? 'צור רשומות משחקים פיקטיביות למטרות בדיקה.' : 'Generate dummy match records for testing purposes.'}
                </p>
                {seedStatus === 'error' && seedError && (
                  <p className="text-[10px] text-red-500 font-bold mb-4 line-clamp-2">{seedError}</p>
                )}
                <button
                  onClick={handleSeedData}
                  disabled={seedStatus === 'loading'}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto ${getButtonClass(seedStatus)}`}
                >
                  {seedStatus === 'loading' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : (isRTL ? 'צור נתוני דוגמה' : 'Generate Samples')}
                </button>
              </div>

              {/* Auto Calculate Scores Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
                  <RefreshCw size={24} className={settings.autoCalcStatus === 'running' ? 'animate-spin' : ''} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{isRTL ? 'חישוב ציונים אוטומטי' : 'Auto Calculate Scores'}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{isRTL ? 'כל' : 'Every'}</span>
                  <input 
                    type="number" 
                    value={settings.calcIntervalSeconds}
                    readOnly
                    className="w-14 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-400 text-xs shadow-sm cursor-not-allowed"
                  />
                  <span className="text-[10px] font-black text-slate-400 uppercase">{isRTL ? 'שניות' : 'Sec'}</span>
                </div>
                {settings.autoCalcStatus === 'error' && (
                  <p className="text-[10px] text-red-500 font-bold mb-4 line-clamp-2">
                    {isRTL ? `שגיאה רציפה: ${settings.consecutiveFailures}/5` : `Consecutive Errors: ${settings.consecutiveFailures}/5`}
                  </p>
                )}
                <button
                  onClick={() => handleUpdateSettings({ isAutoCalcActive: !settings.isAutoCalcActive })}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto 
                    ${!settings.isAutoCalcActive && settings.autoCalcStatus !== 'error' ? 'bg-slate-400 text-white' : 
                      settings.autoCalcStatus === 'running' ? 'bg-emerald-500 text-white' :
                      settings.autoCalcStatus === 'error' ? 'bg-red-500 text-white' :
                      'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${settings.autoCalcStatus === 'running' ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
                  {settings.isAutoCalcActive ? (isRTL ? 'פעיל' : 'Active') : (isRTL ? 'לא פעיל' : 'Inactive')}
                </button>
              </div>

              {/* Consolidate Data Card */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center h-full">
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
                  onClick={handleRecalculate}
                  disabled={recalcStatus === 'loading'}
                  className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 mt-auto ${getButtonClass(recalcStatus)}`}
                >
                  {recalcStatus === 'loading' ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Recalculating...</> : (isRTL ? 'רענן וגבש נתונים' : 'Consolidate Now')}
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
  );
};

export default App;