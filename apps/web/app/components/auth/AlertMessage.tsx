import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { InlineAlert } from "@/components/common/StatusPrimitives";

type AlertMessageProps = {
  errorMessage: string;
  successMessage: string;
}

export function AlertMessage({ errorMessage, successMessage }: AlertMessageProps) {
  return (
    <div className="fixed left-1/2 top-4 z-[70] flex w-[min(92vw,28rem)] -translate-x-1/2 flex-col gap-2">
      {errorMessage && (
        <InlineAlert
          tone="error"
          icon={<WarningCircleIcon className="size-5" weight="regular" />}
          aria-live="assertive"
          aria-atomic="true"
          className="shadow-lg"
        >
          <span className="text-sm leading-6">{errorMessage}</span>
        </InlineAlert>
      )}
      {successMessage && (
        <InlineAlert
          tone="success"
          icon={<CheckCircleIcon className="size-5" weight="regular" />}
          aria-live="polite"
          aria-atomic="true"
          className="shadow-lg"
        >
          <span className="text-sm leading-6">{successMessage}</span>
        </InlineAlert>
      )}
    </div>
  );
}
