import type { Step } from "../types";

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10 mb-8">
      <div className="card-body p-4">
        <ul className="steps steps-horizontal w-full">
          {steps.map(step => (
            <li
              key={step.id}
              className={`step ${currentStep >= step.id ? "step-primary" : ""}`}
              data-content={String(step.id)}
            >
              <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
