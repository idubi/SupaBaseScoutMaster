import React from 'react';
import { Language, SpreadsheetRow } from "../../types";
import AdminView from "./AdminView";


interface AdminBindingProps {
  language: Language;
  history: SpreadsheetRow[];
  isLoading: boolean;
  sheetName: string;
  spreadsheetId: string;
  onBack: () => void;
  onLogout: () => void;
  isSeeding: boolean;
  isRecalculating: boolean;
  lastConsolidationTime: string | null;
  autoCalcActive: boolean;
  autoCalcSeconds: number;
  onSeed: () => void;
  onRecalculate: () => Promise<void>;
  onUpdateSettings: (settings: { isAutoCalcActive?: boolean }) => void;
  teamsGrades: any[];
  isLoadingGrades: boolean;
  onFetchGrades: () => void;
}

const AdminBinding: React.FC<AdminBindingProps> = ({ 
  language, 
  history, 
  isLoading, 
  sheetName, 
  spreadsheetId,
  onBack, 
  onLogout,
  isSeeding,
  isRecalculating,
  lastConsolidationTime,
  autoCalcActive,
  autoCalcSeconds,
  onSeed,
  onRecalculate,
  onUpdateSettings,
  teamsGrades,
  isLoadingGrades,
  onFetchGrades
}) => {
  return (
    <AdminView 
      language={language} 
      history={history} 
      isLoading={isLoading || isLoadingGrades}
      teamsGrades={teamsGrades}
      sheetName={sheetName}
      onBack={onBack} 
      onLogout={onLogout}
      onSeed={onSeed}
      onRecalculate={onRecalculate}
      isSeeding={isSeeding}
      isRecalculating={isRecalculating}
      lastConsolidationTime={lastConsolidationTime}
      autoCalcActive={autoCalcActive}
      autoCalcSeconds={autoCalcSeconds}
      onUpdateSettings={onUpdateSettings}
      onFetchGrades={onFetchGrades}
    />
  );
};

export default AdminBinding;
