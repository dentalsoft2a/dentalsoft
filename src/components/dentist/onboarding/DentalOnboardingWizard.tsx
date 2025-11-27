import { useState } from 'react';
import { ArrowRight, ArrowLeft, Stethoscope } from 'lucide-react';
import { useInitializeDentalCabinet } from '../../../hooks/useDentalOnboarding';
import WelcomeStep from './steps/WelcomeStep';
import CabinetInfoStep from './steps/CabinetInfoStep';
import ServicesStep from './steps/ServicesStep';
import SuppliesStep from './steps/SuppliesStep';
import ConfigurationStep from './steps/ConfigurationStep';
import SummaryStep from './steps/SummaryStep';

const STEPS = [
  { id: 1, name: 'Bienvenue', component: WelcomeStep },
  { id: 2, name: 'Cabinet', component: CabinetInfoStep },
  { id: 3, name: 'Actes', component: ServicesStep },
  { id: 4, name: 'Fournitures', component: SuppliesStep },
  { id: 5, name: 'Configuration', component: ConfigurationStep },
  { id: 6, name: 'Finalisation', component: SummaryStep },
];

export default function DentalOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const initializeCabinet = useInitializeDentalCabinet();

  const handleNext = (data: any) => {
    setStepData((prev) => ({ ...prev, [currentStep]: data }));
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async (finalData: any) => {
    try {
      const serviceIds = stepData[3]?.selectedServices || [];
      const supplyIds = stepData[4]?.selectedSupplies || [];

      const configuration = {
        ...stepData[2],
        ...stepData[5],
        ...finalData,
      };

      console.log('[Dental Onboarding] Finalizing with:', {
        serviceIds: serviceIds.length,
        supplyIds: supplyIds.length,
        configuration
      });

      await initializeCabinet.mutateAsync({
        serviceIds,
        supplyIds,
        configuration,
      });

      console.log('[Dental Onboarding] Initialization successful, reloading page');

      // Force reload to refresh the app state
      window.location.reload();
    } catch (error) {
      console.error('[Dental Onboarding] Error finishing onboarding:', error);
      alert('Erreur lors de la finalisation. Veuillez réessayer.');
    }
  };

  const CurrentStepComponent = STEPS[currentStep - 1]?.component;
  const progress_percentage = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Configuration de votre Cabinet</h1>
                <p className="text-green-100 text-sm">Configurez votre espace de gestion en quelques étapes</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex-1 h-2 rounded-full transition-all ${
                      index < currentStep - 1
                        ? 'bg-white'
                        : index === currentStep - 1
                        ? 'bg-white/60'
                        : 'bg-white/20'
                    }`}
                  />
                  {index < STEPS.length - 1 && <div className="w-1" />}
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-between text-xs text-green-100">
              <span>Étape {currentStep} sur {STEPS.length}</span>
              <span>{Math.round(progress_percentage)}% terminé</span>
            </div>
          </div>

          <div className="p-8">
            {CurrentStepComponent && (
              <CurrentStepComponent
                data={stepData[currentStep]}
                allData={stepData}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onFinish={handleFinish}
                isFirst={currentStep === 1}
                isLast={currentStep === STEPS.length}
                isLoading={initializeCabinet.isPending}
              />
            )}
          </div>

          <div className="px-8 pb-6 flex items-center justify-between border-t pt-6">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </button>

            <div className="flex items-center gap-2">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step.id === currentStep
                      ? 'bg-green-600 w-6'
                      : step.id < currentStep
                      ? 'bg-green-400'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
