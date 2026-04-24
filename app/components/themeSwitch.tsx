import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useLayoutEffect } from "react";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";

const THEME_SWITCHING_CLASS_NAME = "theme-switching";

function syncDocumentTheme(isDark: boolean, lightTheme: string, darkTheme: string) {
  const htmlElement = document.documentElement;

  htmlElement.classList.add(THEME_SWITCHING_CLASS_NAME);
  htmlElement.setAttribute("data-theme", isDark ? darkTheme : lightTheme);
  htmlElement.classList.toggle("dark", isDark);

  window.requestAnimationFrame(() => {
    htmlElement.classList.remove(THEME_SWITCHING_CLASS_NAME);
  });
}

export default function ThemeSwitch() {
  // 浏览器的暗亮模式
  const prefersIsDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // 是否反转浏览器的暗亮模式，存到localstorage中
  // 默认反转一次，确保初始主题为夜间模式
  const [reverseDarkMode, setIsDarkMode] = useLocalStorage("reverseDarkMode", !prefersIsDarkMode);

  const lightTheme = "light";
  // 站点 CSS 里自定义的 DaisyUI 主题名是 "dark"（并且 Tailwind 的 dark: 变体也只匹配 data-theme=dark）
  const darkTheme = "dark";

  // 2. 使用 useLayoutEffect 在浏览器绘制前同步 DOM，减少主题切换闪烁
  useLayoutEffect(() => {
    const isEffectivelyDark = reverseDarkMode !== prefersIsDarkMode;
    syncDocumentTheme(isEffectivelyDark, lightTheme, darkTheme);
  }, [lightTheme, darkTheme, reverseDarkMode, prefersIsDarkMode]);

  return (
    <label className="swap swap-rotate w-4 h-4">
      {/* this hidden checkbox controls the state */}
      <input
        type="checkbox"
        className="theme-controller"
        value={prefersIsDarkMode ? lightTheme : darkTheme}
        checked={reverseDarkMode}
        onChange={() => { setIsDarkMode(!reverseDarkMode); }}
      />

      {/* sun icon */}
      <SunIcon className={`${prefersIsDarkMode ? "swap-off" : "swap-on"} w-6 h-6`} weight="regular" />

      {/* moon icon */}
      <MoonIcon className={`${prefersIsDarkMode ? "swap-on" : "swap-off"} w-6 h-6`} weight="regular" />
    </label>
  );
}
