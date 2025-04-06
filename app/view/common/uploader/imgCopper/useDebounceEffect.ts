import type { DependencyList } from "react";

import { useEffect } from "react";

export function useDebounceEffect(
  fn: (...args: any[]) => void, // 修改函数类型定义
  waitTime: number,
  deps?: DependencyList,
) {
  useEffect(() => {
    const t = setTimeout(() => {
      // 使用类型断言解决参数问题
      fn(...(deps || []) as Parameters<typeof fn>);
    }, waitTime);
    return () => {
      clearTimeout(t);
    };
  }, [deps, fn, waitTime]);
}
