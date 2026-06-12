import { AuthHttpRequest } from "./AuthHttpRequest";
import { TuanChat } from "@tuanchat/openapi-client/TuanChat";
import { resolveRuntimeApiBaseUrl } from "@/utils/runtimeUrl";

export type CreateTuanChatClientOptions = {
  base?: string;
  includeToken?: boolean;
};

let tuanchat = new TuanChat(undefined, AuthHttpRequest);

export function resolveApiBaseUrl(envBaseUrl: string | undefined): string | undefined {
  return resolveRuntimeApiBaseUrl(envBaseUrl);
}

export function createTuanChatClient(options: CreateTuanChatClientOptions = {}) {
  const includeToken = options.includeToken !== false;
  return new TuanChat({
    BASE: resolveApiBaseUrl(options.base ?? import.meta.env.VITE_API_BASE_URL),
    WITH_CREDENTIALS: true,
    CREDENTIALS: "include",
    TOKEN: includeToken ? async () => localStorage?.getItem('token') || '' : undefined,
  }, AuthHttpRequest);
}

if (typeof window !== 'undefined') {
  tuanchat = createTuanChatClient();
}

export { tuanchat };

