import type { ReactNode } from "react";
import type { CSSProperties } from "react";
import type { Toast, ToastOptions } from "react-hot-toast";

import {
  CheckCircleIcon,
  CircleNotch,
  InfoIcon,
  QuestionIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import toast, { Toaster } from "react-hot-toast";

import type { SemanticAppearance } from "@/components/common/DesignLanguage";
import type { SupportIssueId } from "@/components/support/supportCatalog";

import { getSupportIssue } from "@/components/support/supportCatalog";
import { openSupportCenter } from "@/components/support/supportCenterLauncher";

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
  supportIssueId?: SupportIssueId;
  terms?: AppToastTerm[];
  details?: ReactNode;
  actions?: AppToastAction[];
};

export type AppToastMessage = string | AppToastContent;
export type AppToastOptions = ToastOptions & {
  /** Toast 的强调强度；浮层始终保持不透明，避免背景内容干扰。 */
  appearance?: SemanticAppearance;
};

const DEFAULT_TOAST_DURATION = 2500;
const STRUCTURED_TOAST_DURATION = 6000;
const SOFT_SURFACE_MIX = 28;
const BASE_TOAST_STYLE: CSSProperties = {
  borderRadius: "0.5rem",
  boxShadow: "var(--shadow-xl)",
  padding: "0.75rem",
};
const STRUCTURED_TOAST_WRAPPER_STYLE: CSSProperties = {
  background: "transparent",
  border: "none",
  boxShadow: "none",
  padding: 0,
};

function semanticToastSurfaceStyle({
  colorToken,
  contentToken,
  borderMix,
  appearance,
}: {
  colorToken: string;
  contentToken: string;
  borderMix: number;
  appearance: SemanticAppearance;
}): CSSProperties {
  switch (appearance) {
    case "solid":
      return {
        background: `var(${colorToken})`,
        border: `1px solid var(${colorToken})`,
        color: `var(${contentToken})`,
      };
    case "outline":
      return {
        background: "var(--color-base-100)",
        border: `1px solid color-mix(in oklab, var(${colorToken}) 60%, var(--color-base-100))`,
        color: `var(${colorToken})`,
      };
    case "ghost":
      return {
        background: "var(--color-base-100)",
        border: "1px solid transparent",
        color: `var(${colorToken})`,
      };
    default:
      return {
        background: `color-mix(in oklab, var(${colorToken}) ${SOFT_SURFACE_MIX}%, var(--color-base-100))`,
        border: `1px solid color-mix(in oklab, var(${colorToken}) ${borderMix}%, var(--color-base-100))`,
        color: `var(${colorToken})`,
      };
  }
}

const TONE_CLASS: Record<AppToastTone, {
  icon: string;
  colorToken: string;
  contentToken: string;
  borderMix: number;
  plainIconTheme: {
    primary: string;
    secondary: string;
  };
  ariaRole: "alert" | "status";
  ariaLive: "assertive" | "polite";
}> = {
  success: {
    icon: "text-success",
    colorToken: "--color-success",
    contentToken: "--color-success-content",
    borderMix: 56,
    plainIconTheme: {
      primary: "var(--color-success)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "status",
    ariaLive: "polite",
  },
  error: {
    icon: "text-error",
    colorToken: "--color-error",
    contentToken: "--color-error-content",
    borderMix: 56,
    plainIconTheme: {
      primary: "var(--color-error)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "alert",
    ariaLive: "assertive",
  },
  warning: {
    icon: "text-warning",
    colorToken: "--color-warning",
    contentToken: "--color-warning-content",
    borderMix: 60,
    plainIconTheme: {
      primary: "var(--color-warning)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "alert",
    ariaLive: "assertive",
  },
  info: {
    icon: "text-info",
    colorToken: "--color-info",
    contentToken: "--color-info-content",
    borderMix: 56,
    plainIconTheme: {
      primary: "var(--color-info)",
      secondary: "var(--color-base-100)",
    },
    ariaRole: "status",
    ariaLive: "polite",
  },
  loading: {
    icon: "text-info",
    colorToken: "--color-info",
    contentToken: "--color-info-content",
    borderMix: 56,
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

function renderToneIcon(tone: AppToastTone, appearance: SemanticAppearance = "soft") {
  const className = `size-5 ${appearance === "solid" ? "text-current" : TONE_CLASS[tone].icon}`;
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
  appearance = "soft",
  content,
}: {
  toastId: string;
  tone: AppToastTone;
  appearance?: SemanticAppearance;
  content: AppToastContent;
}) {
  const toneClass = TONE_CLASS[tone];
  const surfaceStyle = semanticToastSurfaceStyle({
    colorToken: toneClass.colorToken,
    contentToken: toneClass.contentToken,
    borderMix: toneClass.borderMix,
    appearance,
  });
  const supportIssue = content.supportIssueId
    ? getSupportIssue(content.supportIssueId)
    : null;

  const openHelp = () => {
    if (!content.supportIssueId) {
      return;
    }
    toast.dismiss(toastId);
    void openSupportCenter({
      issueId: content.supportIssueId,
      toastTitle: typeof content.title === "string" ? content.title : supportIssue?.title,
      toastDescription: typeof content.description === "string" ? content.description : supportIssue?.explanation,
    });
  };

  return (
    <div
      role={toneClass.ariaRole}
      aria-live={toneClass.ariaLive}
      aria-atomic="true"
      className="pointer-events-auto w-[min(92vw,26rem)] rounded-md border p-3 shadow-xl"
      style={surfaceStyle}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
          {renderToneIcon(tone, appearance)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-5">
            {content.title}
          </div>
          {content.description
            ? <div className="mt-1 text-sm leading-5 opacity-80">{content.description}</div>
            : null}

          {supportIssue
            ? (
                <div className="mt-2 text-xs leading-5 opacity-75">
                  <span className="font-medium">建议：</span>
                  {supportIssue.suggestions[0]}
                </div>
              )
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
            ? <div className="mt-2 text-xs leading-5 opacity-70">{content.details}</div>
            : null}

          {content.actions?.length
            ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {content.actions.map(action => (
                    <button
                      key={action.label}
                      type="button"
                      className={`
                        rounded-md border border-current/30 px-2 py-1 text-xs font-medium text-current transition-colors
                        hover:border-current/50 hover:bg-current/10
                        focus:outline-none focus:ring-2 focus:ring-info/20
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
        {supportIssue
          ? (
              <button
                type="button"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-current opacity-70 transition hover:bg-base-content/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-info/25"
                aria-label="查看问题帮助"
                title="查看问题帮助"
                onClick={openHelp}
              >
                <QuestionIcon className="size-5" weight="regular" aria-hidden="true" />
              </button>
            )
          : null}
      </div>
    </div>
  );
}

function resolveToastOptions(options?: AppToastOptions) {
  const { appearance = "soft", ...toastOptions } = options ?? {};
  return { appearance, toastOptions };
}

function getStructuredOptions(tone: AppToastTone, options?: ToastOptions): ToastOptions {
  return {
    ...options,
    duration: options?.duration ?? (tone === "loading" ? Infinity : STRUCTURED_TOAST_DURATION),
    style: {
      ...STRUCTURED_TOAST_WRAPPER_STYLE,
      ...options?.style,
    },
    ariaProps: {
      role: TONE_CLASS[tone].ariaRole,
      "aria-live": TONE_CLASS[tone].ariaLive,
      ...options?.ariaProps,
    },
  };
}

function showStructuredToast(
  tone: AppToastTone,
  content: AppToastContent,
  appearance: SemanticAppearance,
  options?: ToastOptions,
) {
  return toast.custom(
    (currentToast: Toast) => (
      <div className={currentToast.visible ? "animate-enter" : "animate-leave"}>
        <AppToastCard toastId={currentToast.id} tone={tone} appearance={appearance} content={content} />
      </div>
    ),
    getStructuredOptions(tone, options),
  );
}

function getPlainOptions(
  tone: AppToastTone,
  appearance: SemanticAppearance,
  options?: ToastOptions,
): ToastOptions {
  const toneClass = TONE_CLASS[tone];
  return {
    ...options,
    style: {
      ...BASE_TOAST_STYLE,
      ...semanticToastSurfaceStyle({
        colorToken: toneClass.colorToken,
        contentToken: toneClass.contentToken,
        borderMix: toneClass.borderMix,
        appearance,
      }),
      ...options?.style,
    },
    iconTheme: {
      ...TONE_CLASS[tone].plainIconTheme,
      ...options?.iconTheme,
    },
  };
}

function showToast(tone: AppToastTone, message: AppToastMessage, options?: AppToastOptions) {
  const { appearance, toastOptions } = resolveToastOptions(options);
  if (isStructuredToastMessage(message)) {
    return showStructuredToast(tone, message, appearance, toastOptions);
  }

  switch (tone) {
    case "success":
      return toast.success(message, { ...getPlainOptions(tone, appearance, toastOptions), icon: renderToneIcon(tone, appearance) });
    case "error":
      return toast.error(message, { ...getPlainOptions(tone, appearance, toastOptions), icon: renderToneIcon(tone, appearance) });
    case "warning":
      return toast(message, { ...getPlainOptions(tone, appearance, toastOptions), icon: renderToneIcon(tone, appearance) });
    case "info":
      return toast(message, { ...getPlainOptions(tone, appearance, toastOptions), icon: renderToneIcon(tone, appearance) });
    case "loading":
      return toast.loading(message, getPlainOptions(tone, appearance, toastOptions));
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
      }}
    />
  );
}
