import type { Dispatch, ReactNode, SetStateAction } from "react";

import CreatePageHeader from "./CreatePageHeader";
import NavigationButtons from "./steps/NavigationButtons";
import StepIndicator from "./steps/StepIndicator";

interface StepDescriptor {
  id: number;
  title: string;
}

interface RoleCreationLayoutProps {
  title: string;
  description: string;
  steps: StepDescriptor[];
  currentStep: number;
  onStepChange: Dispatch<SetStateAction<number>>;
  canProceedCurrent: boolean;
  isSaving: boolean;
  onComplete: () => void | Promise<void>;
  renderContent: () => ReactNode;
  onBack?: () => void;
}

export default function RoleCreationLayout({
  title,
  description,
  steps,
  currentStep,
  onStepChange,
  canProceedCurrent,
  isSaving,
  onComplete,
  renderContent,
  onBack,
}: RoleCreationLayoutProps) {
  const totalSteps = steps.length;

  const handlePrevious = () => {
    onStepChange(Math.max(1, currentStep - 1));
  };

  const handleNext = () => {
    if (!canProceedCurrent || isSaving)
      return;
    onStepChange(Math.min(totalSteps, currentStep + 1));
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CreatePageHeader title={title} description={description} onBack={onBack} />
      <StepIndicator steps={steps} currentStep={currentStep} />
      <div className="mb-8">{renderContent()}</div>
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={totalSteps}
        canProceed={canProceedCurrent && !isSaving}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onComplete={onComplete}
      />
    </div>
  );
}
