import React from 'react';
import { Users, User, Hash, AlertCircle } from 'lucide-react';
import { Language } from '../../types';
import { AuthTranslation_EN, AuthTranslation_HE } from '../translations';

interface AuthFormProps {
  name: string;
  teamScouted: string;
  matchNumber: string;
  role: 'scouter' | 'admin';
  allianceColor: 'Red' | 'Blue';
  setName: (v: string) => void;
  setTeamScouted: (v: string) => void;
  setMatchNumber: (v: string) => void;
  setRole: (v: 'scouter' | 'admin') => void;
  setAllianceColor: (v: 'Red' | 'Blue') => void;
  onSubmit: (e: React.FormEvent, mode?: 'investigate' | 'manage') => void;
  onDeleteGame?: () => void;
  onUpdateMetadata?: () => void;
  language: Language;
  error?: string | null;
  isUpdateMode?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = (props) => {
  const t: any = props.language === Language.HE ? AuthTranslation_HE : AuthTranslation_EN;
  const isRTL = props.language === Language.HE;

  return (
    <div className="max-w-md mx-auto bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 font-sans">
      <div className="text-center mb-10">
        <h2 className={`text-3xl font-black text-[#1a1c2e] uppercase tracking-tight mb-2 ${isRTL ? 'text-2xl' : ''}`}>
          {props.isUpdateMode ? t.updateTitle : t.title}
        </h2>
        <p className={`text-slate-400 font-semibold ${isRTL ? 'text-base' : 'text-sm'}`}>{t.subtitle}</p>
      </div>

      {props.error && !props.isUpdateMode && (
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

      <form onSubmit={props.onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="relative group">
            <Hash className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors`} size={20} />
            <input
              type="text" 
              inputMode="numeric"
              disabled={props.role === 'admin'}
              className={`w-full bg-[#f8faff] border border-slate-100 rounded-2xl py-5 ${isRTL ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'} text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 font-bold ${isRTL ? 'text-lg' : 'text-base'} ${props.role === 'admin' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
              placeholder={t.matchNumber}
              value={props.role === 'admin' ? '' : props.matchNumber}
              onChange={(e) => props.setMatchNumber(e.target.value)}
            />
          </div>

          <div className="relative group">
            <User className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors`} size={20} />
            <input
              type="text"
              className={`w-full bg-[#f8faff] border border-slate-100 rounded-2xl py-5 ${isRTL ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'} text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 font-bold ${isRTL ? 'text-lg' : 'text-base'}`}
              placeholder={props.role === 'admin' ? t.adminName : t.name}
              value={props.name}
              onChange={(e) => props.setName(e.target.value)}
            />
          </div>

          <div className="relative group">
            <Users className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors`} size={20} />
            <input
              type="text" 
              inputMode="numeric"
              disabled={props.role === 'admin'}
              className={`w-full bg-[#f8faff] border border-slate-100 rounded-2xl py-5 ${isRTL ? 'pr-14 pl-5 text-right' : 'pl-14 pr-5 text-left'} text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 font-bold ${isRTL ? 'text-lg' : 'text-base'} ${props.role === 'admin' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
              placeholder={t.teamNumber}
              value={props.role === 'admin' ? '' : props.teamScouted}
              onChange={(e) => props.setTeamScouted(e.target.value)}
            />
          </div>
        </div>

        {props.role === 'scouter' && (
          <div className="pt-2">
            <span className={`block font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4 ${isRTL ? 'text-[11px]' : 'text-[10px]'}`}>{t.teamColor}</span>
            <div className="grid grid-cols-2 gap-4">
              {[ 
                { key: 'Red', label: t.red, activeColor: 'bg-[#e53935] border-[#e53935] text-white shadow-lg shadow-red-500/20', inactiveColor: 'bg-red-50 text-red-600 border-red-100' }, 
                { key: 'Blue', label: t.blue, activeColor: 'bg-[#1e88e5] border-[#1e88e5] text-white shadow-lg shadow-blue-500/20', inactiveColor: 'bg-[#e3f2fd] text-[#1e88e5] border-[#bbdefb]' }
              ].map((pos) => (
                <button
                  key={pos.key} type="button" onClick={() => props.setAllianceColor(pos.key as any)}
                  className={`py-5 px-4 rounded-2xl border-2 font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${
                    props.allianceColor === pos.key 
                    ? pos.activeColor 
                    : pos.inactiveColor
                  } ${isRTL ? 'text-sm' : 'text-xs'}`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2">
          <span className={`block font-black text-slate-400 uppercase tracking-[0.2em] text-center mb-4 ${isRTL ? 'text-[11px]' : 'text-[10px]'}`}>{t.accessLevel}</span>
          <div className="grid grid-cols-2 gap-4">
            {[ 
              { key: 'scouter', label: t.scouter, activeColor: 'bg-[#00a67e] border-[#00a67e] text-white shadow-lg shadow-emerald-500/20', inactiveColor: 'bg-[#e8f5e9] border-[#c8e6c9] text-[#2e7d32]' }, 
              { key: 'admin', label: t.admin, activeColor: 'bg-[#00a67e] border-[#00a67e] text-white shadow-lg shadow-emerald-500/20', inactiveColor: 'bg-[#e8f5e9] border-[#c8e6c9] text-[#2e7d32]' } 
            ].map((r) => (
              <button
                key={r.key} 
                type="button" 
                disabled={props.isUpdateMode}
                onClick={() => props.setRole(r.key as 'scouter' | 'admin')}
                className={`py-4 px-4 rounded-2xl border-2 font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${
                  props.role === r.key 
                  ? r.activeColor 
                  : r.inactiveColor
                } ${isRTL ? 'text-xs' : 'text-[10px]'} ${props.isUpdateMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {props.role === 'admin' ? (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <button 
              type="button"
              onClick={(e) => props.onSubmit(e as any, 'investigate')}
              className={`bg-[#4d4dff] hover:bg-[#4040ff] text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 transform active:scale-[0.98] ${isRTL ? 'text-base' : 'text-sm'}`}
            >
              {t.investigate}
            </button>
            <button 
              type="button"
              onClick={(e) => props.onSubmit(e as any, 'manage')}
              className={`bg-[#4d4dff] hover:bg-[#4040ff] text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 transform active:scale-[0.98] ${isRTL ? 'text-base' : 'text-sm'}`}
            >
              {t.manage}
            </button>
          </div>
        ) : (
          <button 
            type="submit" 
            className={`w-full bg-[#4d4dff] hover:bg-[#4040ff] text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl transition-all shadow-2xl shadow-indigo-500/30 transform active:scale-[0.98] mt-6 ${isRTL ? 'text-lg' : 'text-base'}`}
          >
            {props.isUpdateMode ? t.updateBegin : t.begin}
          </button>
        )}
      </form>
    </div>
  );
};

export default AuthForm;