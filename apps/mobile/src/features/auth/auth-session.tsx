import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import type { UserLoginRequest } from "@tuanchat/openapi-client/models/UserLoginRequest";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { mobileApiClient } from "@/lib/api";
import { mobileQueryClient } from "@/providers/query-client";

import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
  type StoredAuthSession,
} from "./auth-storage";

export type LoginMethod = "username" | "userId";

type LoginInput = {
  identifier: string;
  password: string;
  method: LoginMethod;
};

type AuthSessionContextValue = {
  session: StoredAuthSession | null;
  isBootstrapping: boolean;
  isSigningIn: boolean;
  isAuthenticated: boolean;
  replaceSession: (session: StoredAuthSession | null) => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

async function performLogin(input: LoginInput): Promise<StoredAuthSession> {
  const identifier = input.identifier.trim();
  const password = input.password.trim();
  if (!identifier || !password) {
    throw new Error("请输入账号和密码。");
  }

  const request: UserLoginRequest = { password };
  if (input.method === "username") {
    request.username = identifier;
  }
  else {
    request.userId = identifier;
  }

  let tokenResponse;
  try {
    tokenResponse = await mobileApiClient.userController.login(request);
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "登录失败。"));
  }

  const token = tokenResponse?.data?.trim();
  if (!token) {
    throw new Error("登录成功，但服务端没有返回 token。");
  }

  await writeStoredAuthSession({ token });

  try {
    const me = await mobileApiClient.userController.getMyUserInfo();
    const session: StoredAuthSession = {
      token,
      userId: me.data?.userId,
      username: me.data?.username,
    };
    await writeStoredAuthSession(session);
    return session;
  }
  catch (error) {
    await clearStoredAuthSession();
    const message = extractOpenApiErrorMessage(error, "登录成功，但获取当前用户信息失败。");
    throw new Error(message);
  }
}

function normalizeStoredAuthSession(session: StoredAuthSession | null): StoredAuthSession | null {
  if (!session) {
    return null;
  }

  const token = typeof session.token === "string" ? session.token.trim() : "";
  if (!token) {
    return null;
  }

  return {
    token,
    userId: typeof session.userId === "number" && session.userId > 0 ? session.userId : undefined,
    username: typeof session.username === "string" && session.username.trim().length > 0
      ? session.username.trim()
      : undefined,
  };
}

async function enrichStoredAuthSession(session: StoredAuthSession): Promise<StoredAuthSession> {
  if (session.userId && session.username) {
    return session;
  }

  try {
    const me = await mobileApiClient.userController.getMyUserInfo();
    return normalizeStoredAuthSession({
      token: session.token,
      userId: me.data?.userId ?? session.userId,
      username: me.data?.username ?? session.username,
    }) ?? session;
  }
  catch {
    return session;
  }
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const storedSession = await readStoredAuthSession();
      if (!cancelled) {
        setSession(storedSession);
        setIsBootstrapping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const replaceSession = useCallback(async (nextSession: StoredAuthSession | null) => {
    const normalizedSession = normalizeStoredAuthSession(nextSession);

    if (!normalizedSession) {
      await clearStoredAuthSession();
      setSession(null);
      mobileQueryClient.clear();
      return;
    }

    await writeStoredAuthSession(normalizedSession);
    const enrichedSession = await enrichStoredAuthSession(normalizedSession);
    await writeStoredAuthSession(enrichedSession);
    setSession(enrichedSession);
    await mobileQueryClient.invalidateQueries();
  }, []);

  const signIn = async (input: LoginInput) => {
    setIsSigningIn(true);
    try {
      const nextSession = await performLogin(input);
      await replaceSession(nextSession);
    }
    finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      await mobileApiClient.userController.logout();
    }
    catch {
      // best-effort：本地态清理成功即可。
    }

    await replaceSession(null);
  };

  return (
    <AuthSessionContext
      value={{
        session,
        isBootstrapping,
        isSigningIn,
        isAuthenticated: Boolean(session?.token),
        replaceSession,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthSessionContext>
  );
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession 必须在 AuthSessionProvider 内使用。");
  }
  return value;
}
