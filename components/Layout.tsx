import React from 'react';
import { User, Language } from '../types';
import { LogOut, Shield, Languages, ChevronUp, Menu } from 'lucide-react';
import { LayoutTranslation_EN, LayoutTranslation_HE } from './translations';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  language: Language;
  onLanguageToggle: () => void;
  isNavExpanded: boolean;
  onToggleNav: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  language, 
  onLanguageToggle,
  isNavExpanded,
  onToggleNav
}) => {
  const t = language === Language.HE ? LayoutTranslation_HE : LayoutTranslation_EN;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col" dir={language === Language.HE ? 'rtl' : 'ltr'}>
      {/* Floating Toggle Button */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60]">
        <button 
          onClick={onToggleNav}
          className="bg-indigo-600/90 backdrop-blur-md border border-indigo-400/50 text-white p-2.5 rounded-full shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-all active:scale-90"
          title="Toggle Navigation"
        >
          {isNavExpanded ? <ChevronUp size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Collapsible Nav Bar */}
      <nav className={`border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isNavExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 border-none'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-500" size={24} />
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                {t.appName}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={onLanguageToggle}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors text-xs font-bold"
              >
                <Languages size={14} />
                {t.langSwitch}
              </button>

              {user && (
                <>
                  <div className={`hidden sm:flex flex-col ${language === Language.HE ? 'items-start' : 'items-end'}`}>
                    <span className="text-sm font-semibold text-slate-100">{user.name}</span>
                    <span className="text-[10px] text-indigo-400 uppercase font-black">{t.scoutingTeam} {user.teamScouted}</span>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-grow pt-8 sm:pt-4">
        {children}
      </main>
      
      <footer className="py-4 text-center text-slate-700 text-[10px] font-bold uppercase tracking-widest mt-auto">
        {t.copyright}
      </footer>
    </div>
  );
};