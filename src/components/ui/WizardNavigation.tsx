import React from 'react';
import { Check } from 'lucide-react';

interface WizardStep {
  id: number;
  title: string;
  description: string;
}

interface WizardNavigationProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowClickNavigation?: boolean;
}

const WizardNavigation: React.FC<WizardNavigationProps> = ({
  steps,
  currentStep,
  onStepClick,
  allowClickNavigation = false
}) => {
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'upcoming';
  };

  const getStepStyles = (stepId: number) => {
    const status = getStepStatus(stepId);

    switch (status) {
      case 'completed':
        return {
          circle: 'bg-[#00D4E4] border-[#00D4E4]',
          text: 'text-white',
          line: 'bg-[#00D4E4]',
          titleColor: 'text-white',
          descColor: 'text-gray-400'
        };
      case 'active':
        return {
          circle: 'bg-[#00D4E4] border-[#00D4E4] shadow-[0_0_20px_rgba(0,212,228,0.5)]',
          text: 'text-white',
          line: 'bg-gray-700',
          titleColor: 'text-[#00D4E4]',
          descColor: 'text-gray-400'
        };
      default:
        return {
          circle: 'bg-gray-800 border-gray-600',
          text: 'text-gray-500',
          line: 'bg-gray-700',
          titleColor: 'text-gray-500',
          descColor: 'text-gray-600'
        };
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const styles = getStepStyles(step.id);
          const isCompleted = getStepStatus(step.id) === 'completed';
          const isClickable = allowClickNavigation && (isCompleted || step.id <= currentStep);

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center flex-1">
                {/* Circle */}
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${styles.circle} ${styles.text} ${
                    isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <span className="text-lg font-bold">{step.id}</span>
                  )}
                </button>

                {/* Step Info */}
                <div className="mt-3 text-center">
                  <p className={`text-sm font-semibold ${styles.titleColor} transition-colors duration-300`}>
                    {step.title}
                  </p>
                  <p className={`text-xs mt-1 ${styles.descColor} transition-colors duration-300 max-w-[120px]`}>
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 relative" style={{ marginBottom: '60px' }}>
                  <div className={`h-1 ${styles.line} transition-all duration-500`} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Percentage */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border border-[#00D4E4]/30 bg-[#00D4E4]/10">
          <div className="w-2 h-2 rounded-full bg-[#00D4E4] animate-pulse" />
          <span className="text-sm font-medium text-[#00D4E4]">
            Step {currentStep} of {steps.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WizardNavigation;
