import React from 'react';
import { Gamepad2, Check, ArrowRight, ArrowLeft, Plus, Minus, AlertCircle, X } from 'lucide-react';
import { Language } from '../../types';
import { TeleOpTranslation_EN, TeleOpTranslation_HE } from '../translations';

interface TeleOpFormProps {
  state: any;
  checkboxes: any;
  comments: string;
  totalScore: number;
  onCheck: (key: string) => void;
  onToggleState: (key: string, value: any) => void;
  onCounterChange: (key: string, delta: number) => void;
  onComment: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  onLogout: () => void;
  language: Language;
}

const TeleOpForm: React.FC<TeleOpFormProps> = (props) => {
  const t = props.language === Language.HE ? TeleOpTranslation_HE : TeleOpTranslation_EN;
  const isRTL = props.language === Language.HE;

  const CheckboxComponent = ({ label, id }: { label: string, id: string }) => {
    const isChecked = props.checkboxes[id];
    
    const baseStyles = isChecked 
      ? "bg-emerald-600 border-emerald-500 text-white shadow-md"
      : "bg-red-50 border-red-300 text-red-600 font-bold";

    return (
      <div className="flex flex-col gap-1 w-full">
        <button 
          onClick={() => props.onCheck(id)} 
          className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all duration-300 ${baseStyles}`}
        >
          <span className={`font-black uppercase tracking-widest leading-tight pr-1 ${isRTL ? 'text-right text-[13px]' : 'text-left text-[9px]'}`}>{label}</span>
          <div className={`w-4 h-4 rounded flex items-center justify-center transition-all ${isChecked ? 'bg-white text-slate-900 scale-110' : 'border border-current opacity-30'}`}>
            {isChecked && <Check size={10} strokeWidth={4} />}
          </div>
        </button>
      </div>
    );
  };

  const MassiveCounter = ({ label, value, onAdd, onSub, theme = "emerald" }: { label: string, value: number, onAdd: () => void, onSub: () => void, theme?: "emerald" | "rose" }) => {
    const isRose = theme === "rose";
    return (
      <div className={`${isRose ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'} rounded-3xl border-2 p-4 flex flex-col items-center shadow-sm w-full`}>
        <span className={`font-black uppercase tracking-[0.3em] italic mb-3 text-center ${isRose ? 'text-red-600' : 'text-emerald-600'} ${isRTL ? 'text-xl' : 'text-xs'}`}>
          {label}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={onSub} className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-white rounded-3xl border-2 ${isRose ? 'border-red-100' : 'border-slate-200'} text-slate-300 active:bg-slate-50 shadow-md transition-all transform active:scale-90`}>
            <Minus size={40} strokeWidth={4} />
          </button>
          <span className={`text-5xl font-black min-w-[4.5rem] text-center px-2 ${isRose ? 'text-red-600' : 'text-slate-900'}`}>
            {value}
          </span>
          <button onClick={onAdd} className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${isRose ? 'bg-red-600 border-red-500' : 'bg-emerald-600 border-emerald-500'} rounded-3xl border-4 text-white active:brightness-90 shadow-xl transition-all transform active:scale-90`}>
            <Plus size={40} strokeWidth={4} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white font-sans text-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-indigo-600 text-white p-3 flex items-center justify-between shrink-0" dir="ltr">
        <div className="flex items-center gap-3">
          <button 
            onClick={props.onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col items-start">
            <h1 className="text-base sm:text-xl font-black flex items-center gap-2 uppercase tracking-tighter text-left">
              <Gamepad2 size={18}/> {t.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className={`bg-black/20 px-2 py-0.5 rounded-full border border-white/20 font-black uppercase tracking-tighter flex items-center gap-1.5 ${isRTL ? 'text-[12px]' : 'text-[9px]'}`}>
             <span className="text-emerald-400">{t.hit}: {props.state.intakeCount}</span>
             <span className="opacity-30">|</span>
             <span className="text-rose-400">{t.miss}: {props.state.overflowCount}</span>
           </div>
           <button 
            onClick={props.onLogout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors ml-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-4 space-y-4 overflow-y-auto flex-grow">
        {/* Capabilities Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-2 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col items-center">
            <span className={`font-black uppercase tracking-widest text-slate-400 mb-2 ${isRTL ? 'text-[11px]' : 'text-[8px]'}`}>{t.shooting}</span>
            <div className="grid grid-cols-2 gap-2 w-full">
              <CheckboxComponent label={t.smallTriangle} id="smallTriangle" />
              <CheckboxComponent label={t.bigTriangle} id="bigTriangle" />
            </div>
          </div>
          <div className="p-2 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col items-center">
            <span className={`font-black uppercase tracking-widest text-slate-400 mb-2 ${isRTL ? 'text-[11px]' : 'text-[8px]'}`}>{t.collectionCapabilities}</span>
            <div className="grid grid-cols-2 gap-2 w-full">
              <CheckboxComponent label={t.humanPlayer} id="humanPlayer" />
              <CheckboxComponent label={t.floor} id="floor" />
            </div>
          </div>
        </div>

        {/* Driver Skills */}
        <div className="p-2 rounded-2xl border-2 border-slate-100 bg-slate-50 flex flex-col items-center">
          <span className={`font-black uppercase tracking-widest text-slate-400 mb-2 ${isRTL ? 'text-[11px]' : 'text-[8px]'}`}>{t.driverSkills}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
            <CheckboxComponent label={t.fieldAwareness} id="fieldAwareness" />
            <CheckboxComponent label={t.lateTrans} id="lateTranslation" />
            <CheckboxComponent label={t.fastRebound} id="fastRebound" />
            <CheckboxComponent label={t.frozen} id="isFrozen" />
            <CheckboxComponent label={t.confused} id="confused" />
            <CheckboxComponent label={t.stoppedScoring} id="stoppedScoring" />
          </div>
        </div>

        {/* FOULS */}
        <div className="p-2 rounded-2xl border-2 border-red-100 bg-red-50/30 flex flex-col items-center">
          <span className={`font-black uppercase tracking-widest text-red-400 mb-2 ${isRTL ? 'text-[11px]' : 'text-[8px]'}`}>{t.penalties}</span>
          <div className="grid grid-cols-3 gap-2 w-full">
            <CheckboxComponent label={t.foulGate} id="gateFoul" />
            <CheckboxComponent label={t.foulPark} id="parkingFoul" />
            <CheckboxComponent label={t.foulIntake} id="intakeFoul" />
          </div>
        </div>

        {/* Scoring Counters */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-100">
          <MassiveCounter 
            label={t.hit} 
            value={props.state.intakeCount} 
            onAdd={() => props.onCounterChange('intakeCount', 1)} 
            onSub={() => props.onCounterChange('intakeCount', -1)} 
          />
          <MassiveCounter 
            label={t.miss} 
            value={props.state.overflowCount} 
            theme="rose"
            onAdd={() => props.onCounterChange('overflowCount', 1)} 
            onSub={() => props.onCounterChange('overflowCount', -1)} 
          />
        </div>

        {/* Observations */}
        <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 flex flex-col flex-grow">
          <span className={`font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block italic ${isRTL ? 'text-[12px]' : 'text-[8px]'}`}>{t.observations}</span>
          <textarea 
            className="w-full min-h-[120px] p-3 bg-white border border-slate-200 rounded-xl resize-none outline-none text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 shadow-inner transition-all duration-300"
            placeholder={t.placeholder} value={props.comments} onChange={(e) => props.onComment(e.target.value)}
          />
        </div>

        {/* Navigation */}
        <div className="flex gap-2 pt-1 shrink-0">
          <button onClick={props.onNext} className={`w-full py-4 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 border-b-2 border-indigo-800 transform active:scale-[0.98] transition-all ${isRTL ? 'text-[14px]' : 'text-[9px]'}`}>
            {t.next} <ArrowRight size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeleOpForm;