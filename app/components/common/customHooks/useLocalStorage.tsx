import { useEffect, useState } from "react";

export function getLocalStorageValue<T>(key: string, defaultValue: T): T {
  // getting stored value
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) as T : defaultValue;
  }

  return defaultValue;
}

export function useLocalStorage<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(getLocalStorageValue(key, defaultValue));
  // console.log(value, key);
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
