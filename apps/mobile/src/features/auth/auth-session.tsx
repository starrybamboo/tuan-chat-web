import { ApiError } from "@tuanchat/openapi-client/core/ApiError";
import type { UserLoginRequest } from "@tuanchat/openapi-client/models/UserLoginRequest";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";

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
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

function extractApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    const body = error.body as { errMsg?: unknown; message?: unknown } | undefined;
    if (typeof body?.errMsg === "string" && body.errMsg.trim().length > 0) {
      return body.errMsg.trim();
    }
    if (typeof body?.message === "string" && body.message.trim().length > 0) {
      return body.message.trim();
    }
    if (typeof error.message === "string" && error.message.trim().length > 0) {
      return error.message.trim();
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return fallbackMessage;
}

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
    throw new Error(extractApiErrorMessage(error, "登录失败。"));
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
    const message = extractApiErrorMessage(error, "登录成功，但获取当前用户信息失败。");
    throw new Error(message);
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

  const signIn = async (input: LoginInput) => {
    setIsSigningIn(true);
    try {
      const nextSession = await performLogin(input);
      setSession(nextSession);
      await mobileQueryClient.invalidateQueries();
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

    await clearStoredAuthSession();
    setSession(null);
    mobileQueryClient.clear();
  };

  return (
    <AuthSessionContext
      value={{
        session,
        isBootstrapping,
        isSigningIn,
        isAuthenticated: Boolean(session?.token),
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
