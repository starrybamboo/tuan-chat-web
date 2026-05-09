import { useLocation, useRouter } from "@tanstack/react-router";
import React from "react";

/**
 * 用于便捷的改变url中的searchParam
 * @param key 放你自定义的key
 * @param defaultValue 如果searchParam没有该key，则返回该默认值。并且如果输入的值为默认值，则删除该key，避免url过长
 * @param shortenUrl 默认为true，当url与defaultValue相同的时候，url中不会显示这个值。如果defaultValue会变动，请将此值设置为false
 */
export default function useSearchParamsState<T>(key: string, defaultValue: T, shortenUrl: boolean = true) {
  const location = useLocation();
  const router = useRouter();
  const searchParams = React.useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const valueStr = searchParams.get(key);
  const value = React.useMemo(() => {
    if (valueStr == null) {
      return defaultValue;
    }
    return JSON.parse(valueStr) as T;
  }, [defaultValue, valueStr]);
  const setValue = (newValue: T) => {
    const prev = new URLSearchParams(location.searchStr);
    const shouldDrop = newValue === defaultValue && shortenUrl;
    const nextSerialized = shouldDrop ? null : JSON.stringify(newValue);
    const currentSerialized = prev.get(key);
    if ((nextSerialized == null && currentSerialized == null) || (nextSerialized != null && currentSerialized === nextSerialized)) {
      return;
    }
    if (shouldDrop) {
      prev.delete(key);
    }
    else {
      prev.set(key, nextSerialized as string);
    }
    const nextQuery = prev.toString();
    const nextPath = `${location.pathname}${nextQuery ? `?${nextQuery}` : ""}${location.hash}`;
    router.history.replace(nextPath);
  };
  return [value, setValue] as const;
}
