import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { useEffect } from "react";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";

export default function ThemeSwitch() {
  // 浏览器的暗亮模式
  const prefersIsDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  // 是否反转浏览器的暗亮模式，存到localstorage中
  // 默认反转一次，确保初始主题为夜间模式
  const [reverseDarkMode, setIsDarkMode] = useLocalStorage("reverseDarkMode", !prefersIsDarkMode);

  const lightTheme = "light";
  // 站点 CSS 里自定义的 DaisyUI 主题名是 "dark"（并且 Tailwind 的 dark: 变体也只匹配 data-theme=dark）
  const darkTheme = "dark";

  // 2. 使用 useEffect 来同步 DOM
  // 每当最终模式 (isEffectivelyDark) 发生变化时，此代码块将运行
  useEffect(() => {
    const htmlElement = document.documentElement;
    const isEffectivelyDark = reverseDarkMode !== prefersIsDarkMode;
    // 为 DaisyUI 设置 data-theme 属性
    htmlElement.setAttribute("data-theme", isEffectivelyDark ? darkTheme : lightTheme);
    // 同步 class="dark"，方便其他依赖 class 的逻辑/组件保持一致
    htmlElement.classList.toggle("dark", isEffectivelyDark);
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
