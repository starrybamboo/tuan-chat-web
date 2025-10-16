import type { QueryKey } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/**
 * 一个自定义 Hook，它将 React 的 `useState` 与 TanStack Query 的缓存机制结合起来。
 * 它提供了一个状态变量和其设置函数 (setter)，同时会自动将该状态持久化到查询缓存中。
 *
 * @template T 状态的类型。
 * @param {QueryKey} queryKey 用于查询缓存的键。如果键的任何部分是 `undefined`，
 * 该状态将不会从缓存中读取或写入缓存，此时该键被视为“禁用”状态。
 * @param {T} defaultValue 如果在缓存中找不到任何值，或者键被禁用时，要使用的默认值。
 * @param saveToCache 是否将状态保存到react query的缓存中。默认为 true。
 * @returns {[T, Dispatch<SetStateAction<T>>]} 返回一个包含状态及其设置函数的元组，与 `useState` 的返回值完全相同。
 */
export function useQueryState<T>(
  queryKey: QueryKey,
  defaultValue: T,
  saveToCache = true,
): [T, Dispatch<SetStateAction<T>>] {
  const queryClient = useQueryClient();

  // 使用 useState 的懒初始化函数，此函数仅在组件的初始渲染时执行一次。
  // 它会首先尝试从缓存中获取数据，如果获取不到，则使用传入的默认值。
  const [state, setState] = useState<T>(() => {
    if (saveToCache) {
      const cachedValue = queryClient.getQueryData<T>(queryKey);
      return cachedValue ?? defaultValue;
    }
    return defaultValue;
  });

  // 使用 ref 来实现防抖,避免频繁的缓存更新
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 使用 useEffect 来将组件内的 state 变化同步回 TanStack Query 的缓存中。
  useEffect(() => {
    if (saveToCache) {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器,防抖 16ms (一帧的时间)
      timeoutRef.current = setTimeout(() => {
        queryClient.setQueryData(queryKey, state);
        timeoutRef.current = null;
      }, 16);
    }

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // 在组件卸载时立即保存最新状态
        if (saveToCache) {
          queryClient.setQueryData(queryKey, state);
        }
      }
    };
    // 依赖数组至关重要。它包含了 state 本身以及 queryKey 的所有组成部分。
    // 这样可以确保当 state 发生变化，或者 queryKey (例如 fieldId) 发生变化时，
    // 这个 effect 都会重新执行，从而保证状态与缓存的正确同步。
  }, [state, queryClient, saveToCache, queryKey]);

  return [state, setState];
}
