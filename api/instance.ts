import {TuanChat} from "./TuanChat";

let tuanchat;

if (typeof window !== 'undefined') {
  tuanchat = new TuanChat({
    BASE: import.meta.env.VITE_API_BASE_URL,
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    TOKEN: localStorage?.getItem('token') || '', // 添加默认值
  });
}

export { tuanchat };
