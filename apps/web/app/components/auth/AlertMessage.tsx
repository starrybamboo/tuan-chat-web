import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

type AlertMessageProps = {
  errorMessage: string;
  successMessage: string;
}

export function AlertMessage({ errorMessage, successMessage }: AlertMessageProps) {
  return (
    <div className="toast toast-top toast-center z-[70] w-[min(92vw,28rem)]">
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="alert alert-error items-start gap-3 shadow-lg"
        >
          <WarningCircleIcon className="mt-0.5 size-5 shrink-0" weight="regular" />
          <span className="text-sm leading-6">{errorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="alert alert-success items-start gap-3 shadow-lg"
        >
          <CheckCircleIcon className="mt-0.5 size-5 shrink-0" weight="regular" />
          <span className="text-sm leading-6">{successMessage}</span>
        </div>
      )}
    </div>
  );
}
