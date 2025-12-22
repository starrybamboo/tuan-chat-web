import {TuanChat} from "./TuanChat";

let tuanchat = new TuanChat();

if (typeof window !== 'undefined') {
  tuanchat = new TuanChat({
    BASE: import.meta.env.VITE_API_BASE_URL,
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    // 注意：TOKEN 需要是“动态读取”，否则登录后 tuanchat 仍会使用旧 token
    TOKEN: async () => localStorage?.getItem('token') || '',
  });
}

export { tuanchat };
