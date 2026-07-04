import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect } from "react";

import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "theme";
const THEME_SWITCHING_CLASS_NAME = "theme-switching";

function getSystemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(theme: Theme): boolean {
  return theme === "dark" || (theme === "system" && getSystemDark());
}

function applyTheme(isDark: boolean) {
  const htmlElement = document.documentElement;

  htmlElement.classList.add(THEME_SWITCHING_CLASS_NAME);
  htmlElement.setAttribute("data-theme", isDark ? "dark" : "light");
  htmlElement.classList.toggle("dark", isDark);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", isDark ? "#030712" : "#ffffff");
  }

  window.requestAnimationFrame(() => {
    htmlElement.classList.remove(THEME_SWITCHING_CLASS_NAME);
  });
}

const THEME_OPTIONS = [
  { value: "light" as const, label: "亮色", Icon: SunIcon },
  { value: "dark" as const, label: "暗色", Icon: MoonIcon },
  { value: "system" as const, label: "跟随系统", Icon: DesktopIcon },
];

export default function ThemeSwitch() {
  // 首屏 data-theme 已由 index.html 内联脚本设置；这里仅同步用户后续切换。
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_KEY, "system");

  useLayoutEffect(() => {
    applyTheme(resolveIsDark(theme));
  }, [theme]);

  // system 模式下跟随系统主题实时变化。
  useEffect(() => {
    if (theme !== "system") {
      return;
    }
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(resolveIsDark("system"));
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="主题切换">
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            className={`btn btn-ghost btn-xs btn-square ${isActive ? "text-info" : "text-base-content/55"}`}
            aria-label={label}
            aria-pressed={isActive ? "true" : "false"}
            title={label}
            onClick={() => setTheme(value)}
          >
            <Icon className="size-4" weight="regular" />
          </button>
        );
      })}
    </div>
  );
}
