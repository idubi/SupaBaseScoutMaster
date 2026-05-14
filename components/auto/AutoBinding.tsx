
import React, { useState, useMemo } from 'react';
import { AutoData, Language } from '../../types';
import AutoForm from './AutoForm';

interface AutoBindingProps {
  onNext: (data: AutoData) => void;
  onBack: () => void;
  onLogout: () => void;
  initialData: AutoData;
  language: Language;
}

const AutoBinding: React.FC<AutoBindingProps> = ({ onNext, onBack, onLogout, initialData, language }) => {
  const [data, setData] = useState(initialData);

  const handleZoneToggle = (type: 'small' | 'big') => {
    setData(prev => ({ 
      ...prev, 
      isZoneSmall: type === 'small' ? !prev.isZoneSmall : false,
      isZoneBig: type === 'big' ? !prev.isZoneBig : false
    }));
  };

  const handleLeaveToggle = () => {
    setData(prev => ({ ...prev, leave: !prev.leave }));
  };

  const handleBallsChange = (delta: number) => {
    setData(prev => ({ 
      ...prev, 
      ballsSide: Math.max(0, prev.ballsSide + delta) 
    }));
  };

  const handleMissChange = (delta: number) => {
    setData(prev => ({ ...prev, ballsMissed: Math.max(0, prev.ballsMissed + delta) }));
  };

  const handleNext = () => {
    onNext({ ...data });
  };

  return (
    <AutoForm 
      {...data}
      language={language}
      onZoneToggle={handleZoneToggle}
      onLeaveToggle={handleLeaveToggle}
      onCycleUpdate={() => {}} // No cycles in UI
      onBallsChange={handleBallsChange}
      onMissChange={handleMissChange}
      onGateToggle={() => setData(p => ({ ...p, openGate: !p.openGate }))}
      onIntakeToggle={() => setData(p => ({ ...p, intake: !p.intake }))}
      onTextChange={(freeText) => setData(p => ({ ...p, freeText }))}
      onNext={handleNext}
      onBack={onBack}
      onLogout={onLogout}
    />
  );
};

export default AutoBinding;
