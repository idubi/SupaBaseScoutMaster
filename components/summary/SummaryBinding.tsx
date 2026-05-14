import React, { useState } from 'react';
import { AutoData, TeleOpData, User, SpreadsheetRow, Language } from '../../types';
import SummaryView from './SummaryView';
import { GoogleGenAI } from "@google/genai";

interface SummaryBindingProps {
  auto: AutoData;
  teleop: TeleOpData;
  user: User;
  targetSheetId: string;
  onFinish: (data: Partial<SpreadsheetRow>) => void;
  onBack: () => void;
  onLogout: () => void;
  language: Language;
  error?: string | null;
  isSyncing?: boolean;
  isSubmitting?: boolean;
  onDeleteGame?: () => void;
  onUpdateMetadata?: () => void;
}

const SummaryBinding: React.FC<SummaryBindingProps> = ({ auto, teleop, user, targetSheetId, onFinish, onBack, onLogout, language, error, isSyncing, isSubmitting, onDeleteGame, onUpdateMetadata }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const generateAi = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptText = language === Language.HE 
        ? `הערך את ביצועי קבוצה ${auto.teamScouted} במשחק ${auto.matchNumber}. 
           נתוני אוטונומי: ${JSON.stringify(auto)}. 
           נתוני טלאופ: ${JSON.stringify(teleop)}. 
           ספק סיכום סקאוטינג קצר וקולע עבור מאמן הנהיגה שלנו. השב בעברית בלבד.`
        : `Evaluate Team ${auto.teamScouted} Match ${auto.matchNumber}: 
           Auto Data: ${JSON.stringify(auto)}, 
           TeleOp Data: ${JSON.stringify(teleop)}. 
           Provide a punchy scouting summary for our drive coach. Respond in English only.`;

      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: promptText 
      });
      
      setAiAnalysis(response.text || (language === Language.HE ? "נותח." : "Analyzed."));
    } catch (e) {
      console.error(e);
      setAiAnalysis(language === Language.HE ? "שירות ה-AI אינו זמין כרגע." : "AI logic currently unavailable.");
    } finally { setIsAnalyzing(false); }
  };

  const finalize = () => {
    onFinish({ aiAnalysis: aiAnalysis || '' });
  };

  return (
    <SummaryView 
      language={language} 
      auto={auto} 
      teleop={teleop} 
      user={user}
      aiAnalysis={aiAnalysis} 
      isAnalyzing={isAnalyzing} 
      isSyncing={isSyncing}
      isSubmitting={isSubmitting}
      onBack={onBack} 
      onFinish={finalize} 
      onGenerateAi={generateAi} 
      onLogout={onLogout}
      onDeleteGame={onDeleteGame}
      onUpdateMetadata={onUpdateMetadata}
      error={error}
    />
  );
};

export default SummaryBinding;