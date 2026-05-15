
import fetch from 'node-fetch';
import {ENV}  from "./constants";


const SHEET_NAME = ENV.SHEET_NAME;


const TEAMS = ['15811', '15928', '25041', '6798','16473','18833'];
const MATCHES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const POSITIONS = ['Red 1', 'Red 2', 'Blue 1', 'Blue 2'];

const ALL_HEADERS = [
  '.',  'isAutoZoneSmall', 'isAutoZoneBig', 
  'isAutoLeave', 
  'autoOpenGate', 'autoIntakeUsed', 'autoBallHit', 'autoBallMiss', 'autoNotes',
  'teleBallHit', 'teleBallMiss',
  'teleFieldAwareness',
  'teleLateTranslation', 'teleOverallSuccess', 'teleFastRebound', 'teleIsFrozen', 'teleConfused', 'teleStoppedScoring',
  'teleGateFoul', 'teleParkingFoul', 'teleIntakeFoul', 'teleFoulCount',
  'teleHumanPlayer', 'teleFloor', 'teleComments', 'aiAnalysis', 'recordType'
];

async function syncToSpreadsheet(data: any) {
  const payload = { ...data, sheetName: SHEET_NAME, headers: ALL_HEADERS };
  try {
    const response = await fetch('http://localhost:3000/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    console.log(`Synced Match ${data.matchNumber} for Team ${data.teamScouted}: ${text}`);
  } catch (error) {
    console.error('Sync error:', error);
  }
}

function generateData(team: string, match: number, position: string) {
  const scouterName = "AI Synthetic Bot";
  const zoneType = Math.random() > 0.5 ? 'big' : 'small';
  const leave = Math.random() > 0.3;
  const autoBallHit = Math.floor(Math.random() * 8);
  const autoBallMiss = Math.floor(Math.random() * 4);
  
  const teleBallHit = Math.floor(Math.random() * 30) + 5;
  const long = Math.floor(Math.random() * 15);
  const short = Math.floor(Math.random() * 15);
  const lift = Math.random() > 0.7;
  const full = !lift && Math.random() > 0.5;
  const floor = Math.random() > 0.4;
  const human = Math.random() > 0.4;

  const row: any = {
    sessionId: 'synthetic-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleString(),
    sessionStartTime: new Date().toISOString(),
    sessionEndTime: new Date().toISOString(),
    name: scouterName,
    matchNumber: match.toString(),
    teamScouted: team,
    role: 'scouter',
    isAutoZoneSmall: zoneType === 'small',
    isAutoZoneBig: zoneType === 'big',
    isAutoLeave: leave,
    autoOpenGate: Math.random() > 0.5,
    autoIntakeUsed: Math.random() > 0.5,
    autoBallHit: autoBallHit,
    autoBallMiss: autoBallMiss,
    autoNotes: 'Synthetic data generation',
    teleBallHit: teleBallHit,
    isTeleopZoneSmall: long > 0,
    isTeleopZoneBig: short > 0,
    teleBallMiss: Math.floor(Math.random() * 5),
    teleFieldAwareness: true,
    teleLateTranslation: false,
    teleOverallSuccess: true,
    teleFastRebound: Math.random() > 0.5,
    teleIsFrozen: false,
    teleConfused: false,
    teleStoppedScoring: false,
    teleGateFoul: false,
    teleParkingFoul: false,
    teleIntakeFoul: false,
    teleFoulCount: 0,
    teleHumanPlayer: human,
    teleFloor: floor,
    teleComments: 'Good performance in match ' + match,
    aiAnalysis: 'Synthetic analysis',
    recordType: 'MATCH_COMPLETE',
  };
  return row;
}

async function run() {
  console.log("Starting synthetic data generation...");
  for (const match of MATCHES) {
    // Shuffle teams for each match
    const shuffledTeams = [...TEAMS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 4; i++) {
      const team = shuffledTeams[i];
      const position = POSITIONS[i];
      const data = generateData(team, match, position);
      await syncToSpreadsheet(data);
      // Small delay to avoid hitting rate limits too hard
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.log("Synthetic data generation complete.");
}

run();
