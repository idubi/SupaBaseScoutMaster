
import React from 'react';
import { AutoData, TeleOpData, Language, User } from '../../types';
import { SummaryTranslation_EN, SummaryTranslation_HE, TeleOpTranslation_EN, TeleOpTranslation_HE } from '../translations';
import { CheckCircle2, Wand2, ArrowLeft, Save, Sparkles, Activity, Gamepad2, AlertCircle, X } from 'lucide-react';

interface SummaryViewProps {
  auto: AutoData;
  teleop: TeleOpData;
  user: User;
  aiAnalysis: string | null;
  isAnalyzing: boolean;
  isSyncing?: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onFinish: () => void;
  onLogout: () => void;
  onGenerateAi: () => void;
  onDeleteGame?: () => void;
  onUpdateMetadata?: () => void;
  language: Language;
  error?: string | null;
}

const SummaryView: React.FC<SummaryViewProps> = (props) => {
  const t = props.language === Language.HE ? SummaryTranslation_HE : SummaryTranslation_EN;
  const isRTL = props.language === Language.HE;

  const tTele = props.language === Language.HE ? TeleOpTranslation_HE : TeleOpTranslation_EN;

  const getDriverSkills = () => {
    const skills = [];
    if (props.teleop.fieldAwareness) skills.push(tTele.fieldAwareness);
    if (props.teleop.lateTranslation) skills.push(tTele.lateTrans);
    if (props.teleop.fastRebound) skills.push(tTele.fastRebound);
    if (props.teleop.isFrozen) skills.push(tTele.frozen);
    if (props.teleop.confused) skills.push(tTele.confused);
    if (props.teleop.stoppedScoring) skills.push(tTele.stoppedScoring);
    return skills.length > 0 ? skills.join(', ') : t.none;
  };

  const getCollectionCaps = () => {
    const caps = [];
    if (props.teleop.humanPlayer) caps.push(tTele.humanPlayer);
    if (props.teleop.floor) caps.push(tTele.floor);
    return caps.length > 0 ? caps.join(', ') : t.none;
  };

  const getShootingCaps = () => {
    const caps = [];
    if (props.teleop.long > 0) caps.push(tTele.smallTriangle);
    if (props.teleop.short > 0) caps.push(tTele.bigTriangle);
    if (props.teleop.gateOpen > 0) caps.push(tTele.gateOpen);
    return caps.length > 0 ? caps.join(', ') : t.none;
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl font-sans text-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-indigo-600 text-white p-6 flex flex-col items-center text-center relative" dir="ltr">
        <button 
          onClick={props.onBack}
          className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <button 
          onClick={props.onLogout}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4 border border-white/20">
          <CheckCircle2 size={32} />
        </div>
        <h2 className={`font-black uppercase tracking-tighter ${isRTL ? 'text-2xl' : 'text-2xl'}`}>{t.review} {props.auto.matchNumber}</h2>
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <span className={`px-3 py-1 rounded-full font-bold border border-white/20 uppercase ${isRTL ? 'text-[11px]' : 'text-[10px]'} ${props.user.allianceColor === 'Red' ? 'bg-red-600/40 text-white' : 'bg-blue-600/40 text-white'}`}>
            {isRTL ? (props.user.allianceColor === 'Red' ? 'אדום' : 'כחול') : props.user.allianceColor}
          </span>
          <span className={`bg-black/10 px-3 py-1 rounded-full font-bold border border-white/20 uppercase ${isRTL ? 'text-[11px]' : 'text-[10px]'}`}>{t.team}: {props.auto.teamScouted}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {props.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex flex-row items-center justify-between gap-4" dir="ltr">
            <div className="flex flex-row items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className={`text-red-600 font-bold ${isRTL ? 'text-right text-sm' : 'text-left text-xs'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                {props.error}
              </p>
            </div>
            <div className="flex flex-row gap-2 shrink-0">
              <button 
                type="button"
                onClick={props.onUpdateMetadata}
                className="px-3 py-2 border border-red-200 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-100 transition-colors uppercase tracking-tighter"
              >
                UPDATE GAME METADATA
              </button>
              <button 
                type="button"
                onClick={props.onDeleteGame}
                className="px-3 py-2 border border-red-200 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-100 transition-colors uppercase tracking-tighter"
              >
                DELETE GAME
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Auto Section Summary */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-indigo-600 font-black uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'text-[12px]' : 'text-[10px]'}`}>
                <Activity size={14} /> {t.auto}
              </h3>
            </div>
            <ul className={`space-y-2 text-slate-600 font-medium ${isRTL ? 'text-sm' : 'text-xs'}`}>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.placement}:</span> 
                <span className="font-black text-slate-800 uppercase">{props.auto.zoneType || t.none}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.leave}:</span> 
                <span className={props.auto.leave ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                  {props.auto.leave ? 'YES' : 'NO'}
                </span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.hits}:</span> 
                <span className="font-black text-slate-800">{props.auto.ballsSide}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.misses}:</span> 
                <span className="text-rose-500 font-bold">{props.auto.ballsMissed}</span>
              </li>
              <li className="flex flex-col pt-1">
                <span className="text-slate-400 uppercase text-[10px] font-black tracking-widest mb-1">{t.observations}:</span> 
                <span className="text-slate-800 italic">{props.auto.freeText || t.none}</span>
              </li>
            </ul>
          </div>
          
          {/* Tele-Op Section Summary */}
          <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-violet-600 font-black uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'text-[12px]' : 'text-[10px]'}`}>
                <Gamepad2 size={14} /> {t.tele}
              </h3>
            </div>
            <ul className={`space-y-2 text-slate-600 font-medium ${isRTL ? 'text-sm' : 'text-xs'}`}>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{tTele.shooting}:</span> 
                <span className="font-black text-slate-800">{getShootingCaps()}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{tTele.collectionCapabilities}:</span> 
                <span className="font-black text-slate-800">{getCollectionCaps()}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{tTele.driverSkills}:</span> 
                <span className="font-black text-slate-800">{getDriverSkills()}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.hits}:</span> 
                <span className="font-black text-slate-800">{props.teleop.intake}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.misses}:</span> 
                <span className="text-rose-500 font-bold">{props.teleop.gateOverflow}</span>
              </li>
              <li className="flex justify-between border-b border-slate-200 pb-2">
                <span>{t.penalties}:</span> 
                <div className="flex gap-1">
                  {props.teleop.gateFoul && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.gate}</span>}
                  {props.teleop.parkingFoul && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.park}</span>}
                  {props.teleop.intakeFoul && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{t.intake}</span>}
                  {!props.teleop.gateFoul && !props.teleop.parkingFoul && !props.teleop.intakeFoul && <span className="text-emerald-600 font-bold">CLEAN</span>}
                </div>
              </li>
              <li className="flex flex-col pt-1">
                <span className="text-slate-400 uppercase text-[10px] font-black tracking-widest mb-1">{t.observations}:</span> 
                <span className="text-slate-800 italic">{props.teleop.comments || t.none}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* AI Insight */}
        {props.aiAnalysis ? (
          <div className="bg-indigo-50 border-2 border-indigo-200 p-5 rounded-3xl relative animate-in fade-in slide-in-from-bottom-2 shadow-sm overflow-hidden">
            <Sparkles className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} text-indigo-400 opacity-20`} size={60}/>
            <h4 className={`text-indigo-600 font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2 ${isRTL ? 'text-[12px]' : 'text-[10px]'}`}>
              <Wand2 size={14}/> {t.intelligence}
            </h4>
            <p className={`text-slate-800 italic leading-relaxed font-medium ${isRTL ? 'text-base' : 'text-sm'}`}>"{props.aiAnalysis}"</p>
          </div>
        ) : (
          <button 
            onClick={props.onGenerateAi} 
            disabled={props.isAnalyzing} 
            className={`w-full py-4 rounded-2xl bg-slate-900 text-indigo-400 border border-slate-800 font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-[0.98] ${isRTL ? 'text-[12px]' : 'text-[10px]'}`}
          >
            {props.isAnalyzing ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : <><Wand2 size={16}/> {t.analyze}</>}
          </button>
        )}

        {/* Final Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-100">
          <button 
            onClick={props.onFinish} 
            disabled={props.isSyncing || props.isSubmitting}
            className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.4em] flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] border-b-4 border-emerald-800 ${isRTL ? 'text-[13px]' : 'text-[11px]'} ${(props.isSyncing || props.isSubmitting) ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {props.isSyncing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isRTL ? 'מסנכרן...' : 'SYNCING...'}
              </>
            ) : (
              <>
                <Save size={18} /> {t.finish}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;
