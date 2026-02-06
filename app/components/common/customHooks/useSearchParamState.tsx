import React from "react";
import { useSearchParams } from "react-router";

/**
 * 用于便捷的改变url中的searchParam
 * @param key 放你自定义的key
 * @param defaultValue 如果searchParam没有该key，则返回该默认值。并且如果输入的值为默认值，则删除该key，避免url过长
 * @param shortenUrl 默认为true，当url与defaultValue相同的时候，url中不会显示这个值。如果defaultValue会变动，请将此值设置为false
 */
export default function useSearchParamsState<T>(key: string, defaultValue: T, shortenUrl: boolean = true) {
  const [searchParams, setSearchParams] = useSearchParams();
  const valueStr = searchParams.get(key);
  const cacheRef = React.useRef<{ raw: string | null; parsed: T } | null>(null);
  const value = React.useMemo(() => {
    if (valueStr == null) {
      return defaultValue;
    }
    if (cacheRef.current && cacheRef.current.raw === valueStr) {
      return cacheRef.current.parsed;
    }
    const parsed = JSON.parse(valueStr) as T;
    cacheRef.current = { raw: valueStr, parsed };
    return parsed;
  }, [defaultValue, valueStr]);
  const setValue = (newValue: T) => {
    setSearchParams((prev) => {
      const shouldDrop = newValue === defaultValue && shortenUrl;
      const nextSerialized = shouldDrop ? null : JSON.stringify(newValue);
      const currentSerialized = prev.get(key);
      if ((nextSerialized == null && currentSerialized == null) || (nextSerialized != null && currentSerialized === nextSerialized)) {
        return prev;
      }
      const next = new URLSearchParams(prev);
      if (shouldDrop) {
        next.delete(key);
      }
      else {
        next.set(key, nextSerialized as string);
      }
      return next;
    });
  };
  return [value, setValue] as const;
}
