import { useEffect, useState } from "react";

/**
 * 从localStorage获取指定key的值
 * @param key localStorage中存储的键名
 * @param defaultValue 当key不存在或值为undefined时的默认返回值
 * @returns 解析后的存储值或默认值
 * @template T 返回值类型
 */
export function getLocalStorageValue<T>(key: string, defaultValue: T): T {
  // getting stored value
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    if (saved === null || saved === undefined || saved === "undefined") {
      return defaultValue;
    }
    else {
      return JSON.parse(saved) as T;
    }
  }

  return defaultValue;
}

/**
 * localStorage状态钩子
 * 提供类似useState的功能，但会自动同步到localStorage
 * @param key localStorage中存储的键名
 * @param defaultValue 初始默认值
 * @returns 返回一个状态值和更新函数组成的数组，与useState相同
 * @template T 状态类型
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(getLocalStorageValue(key, defaultValue));
  // console.log(value, key);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
