import { TuanChat } from "./TuanChat";

// 创建OpenAPI实例
export const tuanchat = new TuanChat({
  BASE: import.meta.env.VITE_API_BASE_URL,
  WITH_CREDENTIALS: true,
  CREDENTIALS: "include",
//   TOKEN: ,
});
