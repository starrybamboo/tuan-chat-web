import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

/**
 * 旧的实现，在defaultValue发生改变的时候会出现bug
 */
// export default function useSearchParamsState<T>(key: string, defaultValue: T) {
//   key === "leftDrawer" && console.log("defaultVaue", defaultValue);
//   const [searchParams, setSearchParams] = useSearchParams();
//   const valueStr = searchParams.get(key);
//   const value = valueStr ? (JSON.parse(valueStr) as T) : defaultValue;
//   key === "leftDrawer" && console.log("valueStr", defaultValue);
//   key === "leftDrawer" && console.log("value", value);
//   const setValue = (newValue: T) => {
//     setSearchParams((prev) => {
//       if (newValue === defaultValue) {
//         prev.delete(key);
//         key === "leftDrawer" && console.log("del");
//       }
//       else {
//         prev.set(key, JSON.stringify(newValue));
//         key === "leftDrawer" && console.log("set");
//       }
//       return prev;
//     });
//   };
//   return [value, setValue] as const;
// }
/**
 * 用于便捷的改变url中的searchParam
 * @param key 放你自定义的key
 * @param defaultValue 如果searchParam没有该key，则返回该默认值。并且如果输入的值为默认值，则删除该key，避免url过长
 */
export default function useSearchParamsState<T>(key: string, defaultValue: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const valueStr = searchParams.get(key);
  const [value, rawSetValue] = useState<T>(valueStr ? (JSON.parse(valueStr) as T) : defaultValue);
  const setValue = (newValue: T) => {
    rawSetValue(newValue);
    setSearchParams((prev) => {
      if (newValue === defaultValue) {
        prev.delete(key);
      }
      else {
        prev.set(key, JSON.stringify(newValue));
      }
      return prev;
    });
  };
  useEffect(() => {

  }, [defaultValue, key, setSearchParams, value]);
  return [value, setValue] as const;
}
