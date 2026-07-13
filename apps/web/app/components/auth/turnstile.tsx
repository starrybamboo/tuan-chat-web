import { useEffect, useMemo, useRef } from "react";

import { resolveTurnstileSiteKey } from "./turnstileSiteKey";

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let turnstileScriptPromise: Promise<void> | null = null;

type TurnstileWidgetHandle = {
  render: (
    container: HTMLElement,
    options: {
      "sitekey": string;
      "action"?: string;
      "theme"?: "auto" | "light" | "dark";
      "callback"?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string | number;
  reset: (widgetId?: string | number) => void;
  remove: (widgetId?: string | number) => void;
}

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Window 扩展依赖 interface 声明合并。
  interface Window {
    turnstile?: TurnstileWidgetHandle;
  }
}

function getTurnstileSiteKey() {
  return resolveTurnstileSiteKey({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    envSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
  });
}

export function hasTurnstileSiteKey() {
  // 临时停用登录、注册和账号找回流程的人机验证，恢复时改回站点密钥判断。
  return false;
  // return Boolean(getTurnstileSiteKey());
}

function loadTurnstileScript() {
  if (!hasTurnstileSiteKey()) {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("加载 Turnstile 脚本失败")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("加载 Turnstile 脚本失败"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  token: string;
  onTokenChange: (token: string) => void;
  resetKey: number;
  action: "login" | "register" | "forgot_password";
}

export function TurnstileWidget({ token, onTokenChange, resetKey, action }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const siteKey = useMemo(() => getTurnstileSiteKey(), []);

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return undefined;
    }

    let disposed = false;

    const mountWidget = async () => {
      await loadTurnstileScript();
      if (disposed || !containerRef.current || !window.turnstile) {
        return;
      }

      if (widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        "sitekey": siteKey,
        "action": action,
        "theme": "auto",
        "callback": nextToken => onTokenChange(nextToken),
        "error-callback": () => onTokenChange(""),
        "expired-callback": () => onTokenChange(""),
      });
    };

    void mountWidget();

    return () => {
      disposed = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onTokenChange, resetKey, siteKey]);

  useEffect(() => {
    if (!token && widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [token]);

  if (!siteKey) {
    return null;
  }

  return <div ref={containerRef} className="
    mt-4 flex min-h-[72px] items-center justify-center overflow-hidden
    rounded-md border border-base-300 bg-base-200/60 px-2 py-2
    dark:border-base-200 dark:bg-base-300/60
  " />;
}
