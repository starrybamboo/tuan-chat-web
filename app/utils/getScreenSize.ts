import { useEffect, useState } from "react";

export type ScreenSize = "sm" | "md" | "lg";

/**
 * 闁兼儳鍢茶ぐ鍥亹閹惧啿顤呴悘鐐茬箰缁犻浜搁崫鍕靛殶闁告帒妫涚悮? * - sm: < 640px
 * - md: 640px - 1023px
 * - lg: >= 1024px
 */
export function getScreenSize(): ScreenSize {
  if (typeof window === "undefined") {
    return "lg";
  }
  const width = window.innerWidth;
  if (width < 640)
    return "sm";
  if (width < 1024)
    return "md";
  return "lg";
}

export function isMobileScreen() {
  if (typeof window === "undefined")
    return false;
  return window.innerWidth < 640;
}

/**
 * 闁告繂绉寸花鎻掝嚕?Hook闁挎稒姘ㄥú鍐触椤掍焦笑闁告熬缂氱拹鐔虹矓鐠囨彃袟缂?
 * 濞村吋鑹惧﹢顏嗕沪韫囨挾顔庨悘蹇撴惈椤曨參宕ｅΟ鍝勵嚙闁哄啯鍎奸崵婊堝礉閵婏附绾柡?
 * 婵炲鍔嶉崜浼存晬濮橆剙鐏ュ┑顔碱儏閳ь剛鍘уù鎰偓瑙勭煯鐠?false 濞寸姰鍎垫导鈺呭礂?SSR hydration mismatch
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    // 闁告帗绻傞～鎰板礌閺嶃劍顦х紒鏂款儏瀹撳棛鎷嬮崜褏鏋傛慨婵撶悼閳ユ﹢鎯冮崟顐熷亾?
    setIsMobile(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
