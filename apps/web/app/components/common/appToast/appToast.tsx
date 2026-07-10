import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { Toast, ToastOptions } from "react-hot-toast";

import {
  CheckCircleIcon,
  CircleNotch,
  InfoIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import toast, { Toaster } from "react-hot-toast";

export type AppToastTone = "success" | "error" | "warning" | "info" | "loading";

export type AppToastTerm = {
  label: string;
  description: ReactNode;
};

export type AppToastAction = {
  label: string;
  onClick: () => void;
  /** 默认点击后关闭当前 toast；持续型动作可设为 false。 */
  dismiss?: boolean;
};

export type AppToastContent = {
  title: ReactNode;
  description?: ReactNode;
  terms?: AppToastTerm[];
  details?: ReactNode;
  actions?: AppToastAction[];
};

export type AppToastMessage = string | AppToastContent;
export type AppToastOptions = ToastOptions;

const DEFAULT_TOAST_DURATION = 2500;
const STRUCTURED_TOAST_DURATION = 6000;
const BASE_TOAST_STYLE: CSSProperties = {
  background: "var(--color-base-100)",
  border: "1px solid var(--color-base-300)",
  borderRadius: "0.5rem",
  boxShadow: "var(--shadow-xl)",
  color: "var(--color-base-content)",
};

const TONE_CLASS: Record<AppToastTone, {
  icon: string;
  action: string;
  plainIconTheme: {
    primary: string;
    secondary: string;
  };
  ariaRole: "alert" | "status";
  ariaLive: "assertive" | "polite";
}> = {
  success: {
    icon: "bg-base-200 text-success ring-1 ring-success/25",
    action: "border-base-300 text-success hover:border-success/45 hover:bg-success/10",
    plainIconTheme: {
      primary: "var(--color-success)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "status",
    ariaLive: "polite",
  },
  error: {
    icon: "bg-base-200 text-error ring-1 ring-error/25",
    action: "border-base-300 text-error hover:border-error/45 hover:bg-error/10",
    plainIconTheme: {
      primary: "var(--color-error)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "alert",
    ariaLive: "assertive",
  },
  warning: {
    icon: "bg-base-200 text-warning ring-1 ring-warning/30",
    action: "border-base-300 text-warning hover:border-warning/55 hover:bg-warning/10",
    plainIconTheme: {
      primary: "var(--color-warning)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "alert",
    ariaLive: "assertive",
  },
  info: {
    icon: "bg-base-200 text-info ring-1 ring-info/25",
    action: "border-base-300 text-info hover:border-info/45 hover:bg-info/10",
    plainIconTheme: {
      primary: "var(--color-info)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "status",
    ariaLive: "polite",
  },
  loading: {
    icon: "bg-base-200 text-info ring-1 ring-info/25",
    action: "border-base-300 text-info hover:border-info/45 hover:bg-info/10",
    plainIconTheme: {
      primary: "var(--color-info)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "status",
    ariaLive: "polite",
  },
};

function isStructuredToastMessage(message: AppToastMessage): message is AppToastContent {
  return typeof message !== "string";
}

function renderToneIcon(tone: AppToastTone) {
  const className = "size-5";
  switch (tone) {
    case "success":
      return <CheckCircleIcon className={className} weight="regular" aria-hidden="true" />;
    case "error":
      return <XCircleIcon className={className} weight="regular" aria-hidden="true" />;
    case "warning":
      return <WarningCircleIcon className={className} weight="regular" aria-hidden="true" />;
    case "loading":
      return <CircleNotch className={`${className} animate-spin`} weight="regular" aria-hidden="true" />;
    default:
      return <InfoIcon className={className} weight="regular" aria-hidden="true" />;
  }
}

export function AppToastCard({
  toastId,
  tone,
  content,
}: {
  toastId: string;
  tone: AppToastTone;
  content: AppToastContent;
}) {
  const toneClass = TONE_CLASS[tone];

  return (
    <div
      role={toneClass.ariaRole}
      aria-live={toneClass.ariaLive}
      aria-atomic="true"
      className="
        pointer-events-auto w-[min(92vw,26rem)] rounded-lg border border-base-300 bg-base-100
        p-3 text-base-content shadow-xl ring-1 ring-base-content/5
      "
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${toneClass.icon}`}>
          {renderToneIcon(tone)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-5 text-base-content">
            {content.title}
          </div>
          {content.description
            ? <div className="mt-1 text-sm leading-5 text-base-content/75">{content.description}</div>
            : null}

          {content.terms?.length
            ? (
                <details className="mt-2 rounded-md border border-base-300 bg-base-200/45 px-2 py-1.5">
                  <summary className="cursor-pointer select-none text-xs font-medium text-base-content/70">
                    术语解释
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {content.terms.map(term => (
                      <div key={term.label} className="text-xs leading-5 text-base-content/70">
                        <span className="font-medium text-base-content">{term.label}</span>
                        <span className="mx-1 text-base-content/35">·</span>
                        <span>{term.description}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )
            : null}

          {content.details
            ? <div className="mt-2 text-xs leading-5 text-base-content/60">{content.details}</div>
            : null}

          {content.actions?.length
            ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {content.actions.map(action => (
                    <button
                      key={action.label}
                      type="button"
                      className={`
                        rounded-md border px-2 py-1 text-xs font-medium transition
                        focus:outline-none focus:ring-2 focus:ring-info/20
                        ${toneClass.action}
                      `}
                      onClick={() => {
                        action.onClick();
                        if (action.dismiss !== false) {
                          toast.dismiss(toastId);
                        }
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )
            : null}
        </div>
      </div>
    </div>
  );
}

function getStructuredOptions(tone: AppToastTone, options?: AppToastOptions): AppToastOptions {
  return {
    duration: tone === "loading" ? Infinity : STRUCTURED_TOAST_DURATION,
    style: {
      ...BASE_TOAST_STYLE,
      ...options?.style,
    },
    ...options,
    ariaProps: {
      role: TONE_CLASS[tone].ariaRole,
      "aria-live": TONE_CLASS[tone].ariaLive,
      ...options?.ariaProps,
    },
  };
}

function showStructuredToast(tone: AppToastTone, content: AppToastContent, options?: AppToastOptions) {
  return toast.custom(
    (currentToast: Toast) => (
      <div className={currentToast.visible ? "animate-enter" : "animate-leave"}>
        <AppToastCard toastId={currentToast.id} tone={tone} content={content} />
      </div>
    ),
    getStructuredOptions(tone, options),
  );
}

function getPlainOptions(tone: AppToastTone, options?: AppToastOptions): AppToastOptions {
  return {
    ...options,
    style: {
      ...BASE_TOAST_STYLE,
      ...options?.style,
    },
    iconTheme: {
      ...TONE_CLASS[tone].plainIconTheme,
      ...options?.iconTheme,
    },
  };
}

function showToast(tone: AppToastTone, message: AppToastMessage, options?: AppToastOptions) {
  if (isStructuredToastMessage(message)) {
    return showStructuredToast(tone, message, options);
  }

  switch (tone) {
    case "success":
      return toast.success(message, getPlainOptions(tone, options));
    case "error":
      return toast.error(message, getPlainOptions(tone, options));
    case "warning":
      return toast(message, { ...getPlainOptions(tone, options), icon: <WarningCircleIcon className="size-5 text-warning" weight="regular" /> });
    case "info":
      return toast(message, { ...getPlainOptions(tone, options), icon: <InfoIcon className="size-5 text-info" weight="regular" /> });
    case "loading":
      return toast.loading(message, getPlainOptions(tone, options));
  }
}

export const appToast = {
  success: (message: AppToastMessage, options?: AppToastOptions) => showToast("success", message, options),
  error: (message: AppToastMessage, options?: AppToastOptions) => showToast("error", message, options),
  warning: (message: AppToastMessage, options?: AppToastOptions) => showToast("warning", message, options),
  info: (message: AppToastMessage, options?: AppToastOptions) => showToast("info", message, options),
  loading: (message: AppToastMessage, options?: AppToastOptions) => showToast("loading", message, options),
  custom: (...args: Parameters<typeof toast.custom>) => toast.custom(...args),
  dismiss: toast.dismiss,
  remove: toast.remove,
};

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: DEFAULT_TOAST_DURATION,
        style: BASE_TOAST_STYLE,
      }}
    />
  );
}
