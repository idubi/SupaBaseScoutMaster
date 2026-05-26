
import React, { useState, useEffect } from 'react';
import { User, Language, SpreadsheetRow } from '../../types';
import AuthForm from './AuthForm';
import { AuthTranslation_EN, AuthTranslation_HE } from '../translations';

interface AuthBindingProps {
  onSubmit: (user: User, mode?: 'investigate' | 'manage') => void;
  language: Language;
  initialName?: string;
  initialMatchNumber?: string;
  history: SpreadsheetRow[];
  externalError?: string | null;
  onDeleteGame?: () => void;
  onUpdateMetadata?: () => void;
  isUpdateMode?: boolean;
  isRestrictionError?: boolean;
  initialTeamNumber?: string;
  initialRole?: 'scouter' | 'admin';
  initialAllianceColor?: 'Red' | 'Blue';
}

const AuthBinding: React.FC<AuthBindingProps> = ({ 
  onSubmit, 
  language, 
  initialName = '',
  initialMatchNumber = '',
  initialTeamNumber = '',
  initialRole = 'scouter',
  initialAllianceColor = 'Red',
  history,
  externalError = null,
  onDeleteGame,
  onUpdateMetadata,
  isUpdateMode = false,
  isRestrictionError = false
}) => {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [teamScouted, setTeamScouted] = useState(initialTeamNumber);
  const [matchNumber, setMatchNumber] = useState(initialMatchNumber);
  const [role, setRole] = useState<'scouter' | 'admin'>(initialRole);
  const [allianceColor, setAllianceColor] = useState<'Red' | 'Blue'>(initialAllianceColor);
  const [error, setError] = useState<string | null>(null);
  
  const [authenticatedRole, setAuthenticatedRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuthenticate = async (arg1?: any, arg2?: any) => {
    let activeName = name;
    let activePass = password;

    if (arg1 && typeof arg1 === 'object' && 'preventDefault' in arg1) {
      arg1.preventDefault();
    } else {
      if (typeof arg1 === 'string') activeName = arg1;
      if (typeof arg2 === 'string') activePass = arg2;
    }

    setAuthLoading(true);
    setError(null);

    if (!activeName || !activePass) {
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: activeName, password: activePass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const roleStr = (data.role || '').toLowerCase();
        setAuthenticatedRole(roleStr);
        localStorage.setItem('scoutmaster_saved_user', activeName);
        localStorage.setItem('scoutmaster_saved_pass', activePass);
        
        if (roleStr === 'admin') setRole('admin');
        else if (roleStr === 'scouter') setRole('scouter');
      } else {
        setAuthenticatedRole(null);
        localStorage.removeItem('scoutmaster_saved_user');
        localStorage.removeItem('scoutmaster_saved_pass');
        setError('Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message);
      setAuthenticatedRole(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('scoutmaster_saved_user');
    const savedPass = localStorage.getItem('scoutmaster_saved_pass');
    if (savedUser && savedPass) {
      setName(savedUser);
      setPassword(savedPass);
      handleAuthenticate(savedUser, savedPass);
    }
  }, []);

  const handleLogout = () => {
    setAuthenticatedRole(null);
    setName('');
    setPassword('');
    setTeamScouted('');
    setMatchNumber('');
    localStorage.removeItem('scoutmaster_saved_user');
    localStorage.removeItem('scoutmaster_saved_pass');
    setError(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (authenticatedRole) {
      setAuthenticatedRole(null);
      localStorage.removeItem('scoutmaster_saved_user');
      localStorage.removeItem('scoutmaster_saved_pass');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (authenticatedRole) {
      setAuthenticatedRole(null);
      localStorage.removeItem('scoutmaster_saved_user');
      localStorage.removeItem('scoutmaster_saved_pass');
    }
  };

  const t: any = language === Language.HE ? AuthTranslation_HE : AuthTranslation_EN;

  const handleRoleChange = (newRole: 'scouter' | 'admin') => {
    if (isUpdateMode) return;
    setRole(newRole);
    setError(null);
    if (newRole === 'admin') {
      setTeamScouted('');
      setMatchNumber('');
    }
  };

  const handleSubmit = (e: React.FormEvent, mode?: 'investigate' | 'manage') => {
    e.preventDefault();
    setError(null);

    // If not authenticated, the form submission should try to authenticate
    if (!authenticatedRole) {
      handleAuthenticate();
      return;
    }

    if (role === 'admin') {
      onSubmit({ 
        name: name || 'Admin', 
        teamScouted: '0', 
        matchNumber: '0', 
        role 
      }, mode);
    } else if (name && teamScouted && matchNumber) {
      onSubmit({ name, teamScouted, matchNumber, role, allianceColor });
    }
  };

  const displayError = error || externalError;

  return (
    <AuthForm 
      language={language}
      name={name} setName={handleNameChange}
      password={password} setPassword={handlePasswordChange}
      teamScouted={teamScouted} setTeamScouted={setTeamScouted}
      matchNumber={matchNumber} setMatchNumber={setMatchNumber}
      role={role} setRole={handleRoleChange}
      allianceColor={allianceColor} setAllianceColor={setAllianceColor}
      onSubmit={handleSubmit}
      onAuthenticate={handleAuthenticate}
      onLogout={handleLogout}
      authenticatedRole={authenticatedRole}
      authLoading={authLoading}
      onDeleteGame={onDeleteGame}
      onUpdateMetadata={onUpdateMetadata}
      error={displayError}
      isUpdateMode={isUpdateMode}
      isRestrictionError={isRestrictionError}
    />
  );
};

export default AuthBinding;
