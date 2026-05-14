import React, { useState, useEffect } from 'react';
import { TeleOpData, Language } from '../../types';
import TeleOpForm from './TeleOpForm';

interface TeleOpBindingProps {
  onNext: (data: TeleOpData) => void;
  onBack: () => void;
  onLogout: () => void;
  initialData?: TeleOpData;
  language: Language;
}

const TeleOpBinding: React.FC<TeleOpBindingProps> = ({ onNext, onBack, onLogout, initialData, language }) => {
  const [state, setState] = useState({
    intakeCount: initialData?.intake ?? 0,
    overflowCount: initialData?.gateOverflow ?? 0,
  });

  const [checkboxes, setCheckboxes] = useState({
    smallTriangle: initialData?.isSmallTriangle ?? false,
    bigTriangle: initialData?.isBigTriangle ?? false,
    gateActive: initialData?.isGateActive ?? false,
    fieldAwareness: initialData?.fieldAwareness ?? false,
    lateTranslation: initialData?.lateTranslation ?? false,
    fastRebound: initialData?.fastRebound ?? false,
    isFrozen: initialData?.isFrozen ?? false,
    confused: initialData?.confused ?? false,
    stoppedScoring: initialData?.stoppedScoring ?? false,
    fullParkingType: initialData?.fullParkingType ?? false,
    liftParkingType: initialData?.liftParkingType ?? false,
    noParkingType: initialData?.noParkingType ?? false,
    gateFoul: initialData?.gateFoul ?? false,
    parkingFoul: initialData?.parkingFoul ?? false,
    intakeFoul: initialData?.intakeFoul ?? false,
    humanPlayer: initialData?.humanPlayer ?? false,
    floor: initialData?.floor ?? false,
  });

  const [comments, setComments] = useState(initialData?.comments ?? '');

  const handleCheck = (key: string) => {
    setCheckboxes(prev => {
      const isCurrentlyChecked = (prev as any)[key];
      const newState = { ...prev, [key]: !isCurrentlyChecked };
      
      const isNowChecked = !isCurrentlyChecked;

      // Exclusivity logic for Parking Types
      if (key === 'fullParkingType' && isNowChecked) {
        newState.liftParkingType = false;
        newState.noParkingType = false;
      } 
      else if (key === 'liftParkingType' && isNowChecked) {
        newState.fullParkingType = false;
        newState.noParkingType = false;
      } 
      else if (key === 'noParkingType' && isNowChecked) {
        newState.fullParkingType = false;
        newState.liftParkingType = false;
      }
      
      return newState;
    });
  };

  const handleNext = () => {
    const finalData: TeleOpData = {
      intake: state.intakeCount,
      isSmallTriangle: checkboxes.smallTriangle,
      isBigTriangle: checkboxes.bigTriangle,
      isGateActive: checkboxes.gateActive,
      gateOverflow: state.overflowCount,
      fieldAwareness: checkboxes.fieldAwareness,
      lateTranslation: checkboxes.lateTranslation,
      success: true, 
      fastRebound: checkboxes.fastRebound,
      isFrozen: checkboxes.isFrozen,
      confused: checkboxes.confused,
      stoppedScoring: checkboxes.stoppedScoring,
      fullParkingType: checkboxes.fullParkingType,
      liftParkingType: checkboxes.liftParkingType,
      noParkingType: checkboxes.noParkingType,
      gateFoul: checkboxes.gateFoul,
      parkingFoul: checkboxes.parkingFoul,
      intakeFoul: checkboxes.intakeFoul,
      humanPlayer: checkboxes.humanPlayer,
      floor: checkboxes.floor,
      comments
    };
    onNext(finalData);
  };

  const handleCounterChange = (key: string, delta: number) => {
    setState(prev => ({
      ...prev,
      [key]: Math.max(0, (prev as any)[key] + delta)
    }));
  };

  return (
    <TeleOpForm 
      language={language}
      state={state} 
      checkboxes={checkboxes} 
      comments={comments} 
      onCheck={handleCheck}
      onToggleState={() => {}} 
      onCounterChange={handleCounterChange}
      onComment={setComments} 
      onBack={onBack} 
      onNext={handleNext}
      onLogout={onLogout}
    />
  );
};

export default TeleOpBinding;