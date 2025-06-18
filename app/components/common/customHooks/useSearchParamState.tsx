import { useSearchParams } from "react-router";

/**
 * 用于便捷的改变url中的searchParam
 * @param key 放你自定义的key
 * @param defaultValue 如果searchParam没有该key，则返回该默认值。并且如果输入的值为默认值，则删除该key，避免url过长
 */
export default function useSearchParamsState<T>(key: string, defaultValue: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const valueStr = searchParams.get(key);
  const value = valueStr ? (JSON.parse(valueStr) as T) : defaultValue;
  const setValue = (value: T) => {
    setSearchParams((prev) => {
      if (value === defaultValue) {
        prev.delete(key);
      }
      else {
        prev.set(key, JSON.stringify(value));
      }
      return prev;
    });
  };
  return [value, setValue] as const;
}
