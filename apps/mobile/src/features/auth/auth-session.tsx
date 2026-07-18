import type { UserLoginRequest } from "@tuanchat/openapi-client/models/UserLoginRequest";
import type { PropsWithChildren } from "react";

import { extractOpenApiErrorMessage } from "@tuanchat/domain/open-api-result";
import * as Linking from "expo-linking";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

import { logNotificationTrace, logNotificationTraceError } from "@/features/notifications/notificationTrace";
import { getMobileApiBaseUrl, mobileApiClient } from "@/lib/api";
import { clearMobileUserQuerySnapshots } from "@/lib/mobile-query-snapshot-cache";
import { mobileQueryClient } from "@/providers/query-client";

import type { StoredAuthSession } from "./auth-storage";

import {
  clearStoredAuthSession,
  readStoredAuthSession,

  writeStoredAuthSession,
} from "./auth-storage";
import { resolveMobileWebAuthCallbackSession } from "./mobile-web-auth";

const AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS = 1500;

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

  logNotificationTrace("auth.login.start", {
    apiBaseUrl: getMobileApiBaseUrl(),
    endpoint: "/user/login",
    identifier,
    method: input.method,
  });

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
    logNotificationTraceError("auth.login.error", error);
    throw new Error(extractOpenApiErrorMessage(error, "登录失败。"));
  }

  const token = tokenResponse?.data?.trim();
  if (!token) {
    throw new Error("登录成功，但服务端没有返回 token。");
  }

  await writeStoredAuthSession({ token });
  logNotificationTrace("auth.login.token-received");

  try {
    const me = await mobileApiClient.userController.getMyUserInfo();
    const session: StoredAuthSession = {
      token,
      userId: me.data?.userId,
      username: me.data?.username,
    };
    await writeStoredAuthSession(session);
    logNotificationTrace("auth.login.done", {
      userId: session.userId ?? null,
      username: session.username ?? null,
    });
    return session;
  }
  catch (error) {
    await clearStoredAuthSession();
    logNotificationTraceError("auth.login.profile-error", error);
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

async function readStoredAuthSessionWithTimeout() {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      readStoredAuthSession(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => {
          resolve(null);
        }, AUTH_SESSION_BOOTSTRAP_TIMEOUT_MS);
      }),
    ]);
  }
  finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function clearUserQuerySnapshotsSafely(userId: number | undefined) {
  if (!(typeof userId === "number" && userId > 0)) {
    return;
  }
  try {
    await clearMobileUserQuerySnapshots(userId);
  }
  catch (error) {
    logNotificationTraceError("auth.cache.clear-error", error);
  }
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let storedSession: StoredAuthSession | null = null;
      try {
        storedSession = await readStoredAuthSessionWithTimeout();
      }
      catch (error) {
        logNotificationTraceError("auth.bootstrap.read-error", error);
        storedSession = null;
      }

      logNotificationTrace("auth.bootstrap.done", {
        hasSession: Boolean(storedSession),
        userId: storedSession?.userId ?? null,
        username: storedSession?.username ?? null,
      });

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
    const previousUserId = session?.userId;

    if (!normalizedSession) {
      logNotificationTrace("auth.replace.clear");
      await clearStoredAuthSession();
      await clearUserQuerySnapshotsSafely(previousUserId);
      setSession(null);
      mobileQueryClient.clear();
      return;
    }

    logNotificationTrace("auth.replace.persist", {
      userId: normalizedSession.userId ?? null,
      username: normalizedSession.username ?? null,
    });
    await writeStoredAuthSession(normalizedSession);
    const enrichedSession = await enrichStoredAuthSession(normalizedSession);
    await writeStoredAuthSession(enrichedSession);
    if (previousUserId && previousUserId !== enrichedSession.userId) {
      await clearUserQuerySnapshotsSafely(previousUserId);
      mobileQueryClient.clear();
    }
    setSession(enrichedSession);
    await mobileQueryClient.invalidateQueries();
  }, [session?.userId]);

  const handleWebAuthCallback = useCallback(async (url: string | null | undefined) => {
    const callbackSession = resolveMobileWebAuthCallbackSession(url);
    if (!callbackSession) {
      return;
    }

    logNotificationTrace("auth.web-callback.received", {
      hasUserId: typeof callbackSession.userId === "number",
      hasUsername: Boolean(callbackSession.username),
    });
    await replaceSession(callbackSession);
  }, [replaceSession]);

  useEffect(() => {
    let cancelled = false;

    void Linking.getInitialURL()
      .then((initialUrl) => {
        if (!cancelled) {
          void handleWebAuthCallback(initialUrl);
        }
      })
      .catch(error => logNotificationTraceError("auth.web-callback.initial-url-error", error));

    const subscription = Linking.addEventListener("url", (event) => {
      void handleWebAuthCallback(event.url);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [handleWebAuthCallback]);

  const signIn = useCallback(async (input: LoginInput) => {
    setIsSigningIn(true);
    try {
      const nextSession = await performLogin(input);
      await replaceSession(nextSession);
    }
    finally {
      setIsSigningIn(false);
    }
  }, [replaceSession]);

  const signOut = useCallback(async () => {
    try {
      await mobileApiClient.userController.logout();
    }
    catch {
      // best-effort：本地态清理成功即可。
    }

    logNotificationTrace("auth.logout");
    await replaceSession(null);
  }, [replaceSession]);
  const contextValue = useMemo(() => ({
    session,
    isBootstrapping,
    isSigningIn,
    isAuthenticated: Boolean(session?.token),
    replaceSession,
    signIn,
    signOut,
  }), [isBootstrapping, isSigningIn, replaceSession, session, signIn, signOut]);

  return (
    <AuthSessionContext
      value={contextValue}
    >
      {children}
    </AuthSessionContext>
  );
}

export function useAuthSession() {
  const value = use(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession 必须在 AuthSessionProvider 内使用。");
  }
  return value;
}
