import React, { useState } from 'react';
import { Users, User, Hash, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { Language } from '../../types';
import { AuthTranslation_EN, AuthTranslation_HE } from '../translations';

interface AuthFormProps {
  name: string;
  password?: string;
  setPassword?: (v: string) => void;
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
  onAuthenticate?: (e: React.MouseEvent) => void;
  onLogout?: () => void;
  authenticatedRole?: string | null;
  authLoading?: boolean;
  onDeleteGame?: () => void;
  onUpdateMetadata?: () => void;
  language: Language;
  error?: string | null;
  isUpdateMode?: boolean;
  isRestrictionError?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = (props) => {
  const [showPassword, setShowPassword] = useState(false);
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
        <div className={`mb-6 p-4 ${props.isRestrictionError ? 'bg-red-600' : 'bg-red-50'} border ${props.isRestrictionError ? 'border-red-700' : 'border-red-200'} rounded-2xl flex flex-col gap-4 text-center items-center`} dir="ltr">
          <div className="flex flex-row items-center gap-3">
            <AlertCircle className={`${props.isRestrictionError ? 'text-white' : 'text-red-500'} shrink-0`} size={20} />
            <p className={`${props.isRestrictionError ? 'text-white font-black uppercase tracking-tight' : 'text-red-600 font-bold'} ${isRTL ? 'text-right text-sm' : 'text-left text-xs'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {props.error}
            </p>
          </div>
          <div className="flex flex-row gap-2 w-full">
            {props.isRestrictionError ? (
              <button 
                type="button"
                onClick={props.onDeleteGame}
                className="w-full px-4 py-4 bg-white text-red-600 rounded-xl text-xs font-black hover:bg-red-50 transition-all uppercase tracking-widest shadow-lg active:scale-[0.98]"
              >
                {t.cancelAndReturn}
              </button>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={props.onUpdateMetadata}
                  className="flex-1 px-3 py-2 border border-red-200 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-100 transition-colors uppercase tracking-tighter"
                >
                  {t.updateTitle}
                </button>
                <button 
                  type="button"
                  onClick={props.onDeleteGame}
                  className="flex-1 px-3 py-2 border border-red-200 rounded-xl text-[10px] font-black text-red-600 hover:bg-red-100 transition-colors uppercase tracking-tighter"
                >
                  {t.deleteGame}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <form onSubmit={props.onSubmit} className={`space-y-6 ${props.isRestrictionError ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="space-y-4">
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
            <Lock className={`absolute ${isRTL ? 'right-5' : 'left-5'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors`} size={20} />
            <input
              type="text"
              autoComplete="off"
              data-1p-ignore
              style={showPassword ? {} : { WebkitTextSecurity: 'disc' } as any}
              className={`w-full bg-[#f8faff] border border-slate-100 rounded-2xl py-5 ${isRTL ? 'pr-14 pl-14 text-right' : 'pl-14 pr-14 text-left'} text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 font-bold ${isRTL ? 'text-lg' : 'text-base'}`}
              placeholder={t.password}
              value={props.password || ''}
              onChange={(e) => props.setPassword?.(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-2`}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          {props.authenticatedRole && (
            <>
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
            </>
          )}
        </div>

        {props.authenticatedRole && props.role === 'scouter' && (
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
            ].map((r) => {
              const isDisabledByRole = !props.authenticatedRole || (props.authenticatedRole !== 'both' && props.authenticatedRole !== r.key);
              const visuallyDisabled = props.isUpdateMode || isDisabledByRole;
              return (
                <button
                  key={r.key} 
                  type="button" 
                  disabled={visuallyDisabled}
                  onClick={() => props.setRole(r.key as 'scouter' | 'admin')}
                  className={`py-4 px-4 rounded-2xl border-2 font-black uppercase tracking-[0.2em] transition-all transform active:scale-[0.98] ${
                    props.role === r.key && props.authenticatedRole
                    ? r.activeColor 
                    : r.inactiveColor
                  } ${isRTL ? 'text-xs' : 'text-[10px]'} ${visuallyDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </div>

        {!props.authenticatedRole ? (
          <button 
            type="button" 
            onClick={props.onAuthenticate}
            disabled={props.authLoading}
            className={`w-full bg-[#4d4dff] hover:bg-[#4040ff] text-white font-black uppercase tracking-[0.2em] py-6 rounded-2xl transition-all shadow-2xl shadow-indigo-500/30 transform active:scale-[0.98] mt-6 ${isRTL ? 'text-lg' : 'text-base'} ${props.authLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            {props.authLoading ? '...' : (isRTL ? 'התחבר' : 'Login')}
          </button>
        ) : props.role === 'admin' ? (
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

        {props.authenticatedRole && (
          <button
            type="button"
            onClick={props.onLogout}
            className="w-full border-2 border-slate-200 text-slate-500 font-extrabold uppercase tracking-[0.2em] py-4 rounded-2xl transition-all hover:bg-slate-50 active:scale-[0.98] text-xs mt-3 flex items-center justify-center gap-2"
          >
            {t.logout}
          </button>
        )}
      </form>
    </div>
  );
};

export default AuthForm;