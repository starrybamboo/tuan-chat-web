import type { DependencyList } from "react";

import { useEffect } from "react";

/**
 * 防抖 Effect Hook
 * @param fn 要执行的函数
 * @param waitTime 等待时间（毫秒）
 * @param deps 依赖数组
 */
export function useDebounceEffect(
  fn: (...args: any[]) => void,
  waitTime: number,
  deps?: DependencyList,
) {
  useEffect(() => {
    const t = setTimeout(() => {
      fn(...(deps || []) as Parameters<typeof fn>);
    }, waitTime);
    return () => {
      clearTimeout(t);
    };
  }, [deps, fn, waitTime]);
}
