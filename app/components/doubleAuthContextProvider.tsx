// // AuthContext.tsx
// import { createContext, useEffect, useMemo, useState } from "react";
// import { tuanchat } from "../../api/instance";

// interface AuthContextType {
//   isAuthenticated: boolean;
//   checkAuth: () => Promise<void>;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   const checkAuth = async () => {
//     // 无论Token是否过期，尝试刷新token
//     const res = await tuanchat.userController.refresh();
//     if (!res.ok) {
//       // 如果刷新失败，说明登录状态无效
//       setIsAuthenticated(false);
//       return;
//     }
//     // 如果刷新成功，说明登录状态有效
//     setIsAuthenticated(true);
//   };

//   useEffect(() => {
//     const accessToken = localStorage.getItem("accessToken");
//     if (accessToken) {
//       checkAuth();
//     }
//   }, []);

//   const value = useMemo(() => ({
//     isAuthenticated,
//     checkAuth,
//   }), [isAuthenticated]);

//   return (
//     <AuthContext value={value}>
//       {children}
//     </AuthContext>
//   );
// }
