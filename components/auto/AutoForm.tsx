import React from 'react';
import { AutoCycle, Language } from '../../types';
import { AutoTranslation_EN, AutoTranslation_HE } from '../translations';
import { Check, Plus, Minus, ArrowRight, Cpu, ArrowLeft, X } from 'lucide-react';

interface AutoFormProps {
  matchNumber: string;
  teamScouted: string;
  isZoneSmall: boolean;
  isZoneBig: boolean;
  leave: boolean;
  cycles: AutoCycle[];
  ballsSide: number;
  ballsMissed: number;
  openGate: boolean;
  intake: boolean;
  freeText: string;
  onZoneToggle: (t: string) => void;
  onLeaveToggle: () => void;
  onCycleUpdate: (id: string, d: number) => void;
  onBallsChange: (d: number) => void;
  onMissChange: (d: number) => void;
  onGateToggle: () => void;
  onIntakeToggle: () => void;
  onTextChange: (text: string) => void;
  onNext: () => void;
  onBack: () => void;
  onLogout: () => void;
  language: Language;
}

const AutoForm: React.FC<AutoFormProps> = (props) => {
  const t = props.language === Language.HE ? AutoTranslation_HE : AutoTranslation_EN;
  const isRTL = props.language === Language.HE;

  const UniformCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all duration-300 ${
        checked 
        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md' 
        : 'bg-red-50 border-red-300 text-red-600 font-bold'
      }`}
    >
      <span className={`font-black uppercase tracking-widest leading-tight pr-2 ${isRTL ? 'text-right text-[14px]' : 'text-left text-[9px]'}`}>{label}</span>
      <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${checked ? 'bg-white text-slate-900 scale-110' : 'border border-current opacity-30'}`}>
        {checked && <Check size={10} strokeWidth={4} />}
      </div>
    </button>
  );

  return (
    <div className="bg-white text-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl max-w-full mx-auto select-none font-sans flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-indigo-600 px-4 py-4 flex justify-between items-center text-white shrink-0" dir="ltr">
        <div className="flex items-center gap-3">
          <button 
            onClick={props.onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-start'}`}>
            <span className={`font-black uppercase tracking-widest flex items-center gap-2 ${isRTL ? 'text-[15px]' : 'text-[10px]'}`}>
              <Cpu size={14} className="animate-pulse" />
              {t.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`bg-black/20 px-3 py-1 rounded-full border border-white/20 font-black uppercase tracking-tighter flex items-center gap-2 ${isRTL ? 'text-[14px]' : 'text-[10px]'}`}>
             <span className="text-emerald-400">{t.hit}: {props.ballsSide}</span>
             <span className="opacity-30">|</span>
             <span className="text-rose-400">{t.miss}: {props.ballsMissed}</span>
           </div>
           <button 
            onClick={props.onLogout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-grow">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-2xl border-2 transition-all duration-300 bg-slate-50 border-slate-100">
            <span className={`font-black uppercase tracking-widest mb-2 block text-center text-slate-400 ${isRTL ? 'text-[12px]' : 'text-[8px]'}`}>
              {t.zoneType}
            </span>
            <div className="flex gap-1.5">
              {[ {k: 'big', l: t.big, checked: props.isZoneBig}, {k: 'small', l: t.small, checked: props.isZoneSmall}].map(item => (
                <button
                  key={item.k}
                  onClick={() => props.onZoneToggle(item.k)}
                  className={`flex-1 py-2.5 rounded-xl font-black uppercase transition-all ${
                    item.checked 
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'bg-red-50 border-red-300 text-red-600'
                  } ${isRTL ? 'text-[14px]' : 'text-[9px]'}`}
                >
                  {item.l}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className={`font-black uppercase tracking-widest text-center text-slate-400 ${isRTL ? 'text-[12px]' : 'text-[8px]'}`}>{t.mobility}</span>
            <UniformCheckbox label={t.leave} checked={props.leave} onChange={props.onLeaveToggle} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <UniformCheckbox label={t.openGate} checked={props.openGate} onChange={props.onGateToggle} />
          <UniformCheckbox label={t.intake} checked={props.intake} onChange={props.onIntakeToggle} />
        </div>

        {/* Counter Section strictly on top of Free Text */}
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-3xl border-2 border-slate-100 p-4 flex flex-col items-center shadow-sm">
             <span className={`font-black uppercase text-emerald-600 tracking-[0.3em] italic mb-3 text-center ${isRTL ? 'text-xl' : 'text-xs'}`}>{t.hit}</span>
             <div className="flex items-center gap-0.5">
               <button onClick={() => props.onBallsChange(-1)} className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-3xl border-2 border-slate-200 text-slate-300 active:bg-slate-50 shadow-md transition-all transform active:scale-90">
                 <Minus size={40} strokeWidth={4} />
               </button>
               <span className="text-5xl font-black text-slate-900 min-w-[4.5rem] text-center px-2">{props.ballsSide}</span>
               <button onClick={() => props.onBallsChange(1)} className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-emerald-600 rounded-3xl border-4 border-emerald-500 text-white active:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all transform active:scale-90">
                 <Plus size={40} strokeWidth={4} />
               </button>
             </div>
          </div>

          <div className="bg-red-50 rounded-3xl border-2 border-red-100 p-4 flex flex-col items-center shadow-sm">
             <span className={`font-black uppercase text-red-600 tracking-[0.3em] italic mb-3 text-center ${isRTL ? 'text-xl' : 'text-xs'}`}>{t.miss}</span>
             <div className="flex items-center gap-0.5">
               <button onClick={() => props.onMissChange(-1)} className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-3xl border-2 border-red-100 text-slate-300 active:bg-red-50 shadow-md transition-all transform active:scale-90">
                 <Minus size={40} strokeWidth={4} />
               </button>
               <span className="text-5xl font-black text-red-600 min-w-[4.5rem] text-center px-2">{props.ballsMissed}</span>
               <button onClick={() => props.onMissChange(1)} className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-red-600 rounded-3xl border-4 border-red-500 text-white active:bg-red-700 shadow-xl shadow-red-600/20 transition-all transform active:scale-90">
                 <Plus size={40} strokeWidth={4} />
               </button>
             </div>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col flex-grow">
          <span className={`font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block italic ${isRTL ? 'text-[13px]' : 'text-[8px]'}`}>{t.observations}</span>
          <textarea 
            className="w-full min-h-[120px] p-3 bg-white border border-slate-200 rounded-xl resize-none outline-none text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 shadow-inner transition-all duration-300"
            placeholder={t.placeholder} 
            value={props.freeText} 
            onChange={(e) => props.onTextChange(e.target.value)}
          />
        </div>

        <button 
          onClick={props.onNext} 
          className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-b-4 bg-indigo-600 text-white border-indigo-800 shadow-xl shadow-indigo-600/20 shrink-0 ${isRTL ? 'text-[16px]' : 'text-[11px]'}`}
        >
          {t.confirm} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AutoForm;
