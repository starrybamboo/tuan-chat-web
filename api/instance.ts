import {TuanChat} from "./TuanChat";

let tuanchat = new TuanChat();

if (typeof window !== 'undefined') {
  tuanchat = new TuanChat({
    BASE: import.meta.env.VITE_API_BASE_URL,
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    TOKEN: localStorage?.getItem('token') || '',
  });
}

export { tuanchat };
