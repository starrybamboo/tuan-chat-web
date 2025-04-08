import { createContext, use, useEffect, useState } from "react";

interface GlobalContextType {
  userId: number | null;
  setUserId: (userId: number | null) => void;
}
const GlobalContext = createContext<GlobalContextType>({
  userId: null,
  setUserId: () => {},
});
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalContext = () => use(GlobalContext);
export function GlobalContextProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<number | null>(null);
  // 自动同步 localStorage 变化
  useEffect(() => {
    const token = localStorage.getItem("token");
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setUserId(token ? Number(token) : null);
  }, []);
  return (
    <GlobalContext value={{ userId, setUserId }}>
      {children}
    </GlobalContext>
  );
}
