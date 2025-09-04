interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  canProceed: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
}

export default function NavigationButtons({
  currentStep,
  totalSteps,
  canProceed,
  onPrevious,
  onNext,
  onComplete,
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between">
      <button
        type="button"
        className="btn btn-outline rounded-md"
        onClick={onPrevious}
        disabled={currentStep === 1}
      >
        ← 上一步
      </button>
      {currentStep < totalSteps
        ? (
            <button
              type="button"
              className="btn btn-primary rounded-md"
              onClick={onNext}
              disabled={!canProceed}
            >
              下一步 →
            </button>
          )
        : (
            <button
              type="button"
              className="btn btn-success  rounded-md bg-gradient-to-r from-green-500 to-emerald-500 border-none"
              onClick={onComplete}
            >
              完成创建 ✨
            </button>
          )}
    </div>
  );
}
