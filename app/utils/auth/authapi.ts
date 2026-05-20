import type { UserLoginRequest, UserRegisterRequest } from "api";

import { queryClient, resetTuanChatQueryCache } from "@/queryClient";
import { extractOpenApiErrorMessage } from "@/utils/openApiResult";
import { ApiError } from "@tuanchat/openapi-client/core/ApiError";

import { tuanchat } from "../../../api/instance";
import { dispatchStoredAuthSessionChanged } from "./sessionEvents";

// 获取错误信息的优先级：
// 1. error 对象中的 body.errMsg
// 2. error 对象的 message
// 3. 默认错误信息

type AuthStatus = {
  isLoggedIn: boolean;
  token?: string;
  uid?: number;
};

function readStoredToken() {
  return String(localStorage.getItem("token") || "").trim();
}

function readStoredUid() {
  const rawUid = String(localStorage.getItem("uid") || "").trim();
  if (!rawUid) {
    return undefined;
  }

  const uid = Number(rawUid);
  return Number.isFinite(uid) && uid > 0 ? uid : undefined;
}

function buildLoggedInStatus(token: string, uid?: number): AuthStatus {
  if (typeof uid === "number" && uid > 0) {
    return { isLoggedIn: true, token, uid };
  }

  return { isLoggedIn: true, token };
}

function persistUid(uid?: number) {
  if (typeof uid === "number" && uid > 0) {
    localStorage.setItem("uid", String(uid));
    return;
  }

  localStorage.removeItem("uid");
}

function clearStoredAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("uid");
}

function syncAuthStatusCache(status: AuthStatus) {
  queryClient.setQueryData(getAuthStatusQueryKey(), status);
}

function isUnauthorizedApiError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

async function resolveAuthenticatedUid(
  loginRequest: UserLoginRequest,
  loginMethod: "username" | "userId",
) {
  try {
    const myInfo = await tuanchat.userController.getMyUserInfo();
    const uid = myInfo?.data?.userId;
    if (typeof uid === "number" && uid > 0) {
      return uid;
    }
  }
  catch {
    // Ignore and fall back to less authoritative uid lookup paths below.
  }

  if (loginMethod === "userId") {
    const uid = Number(loginRequest.userId);
    return Number.isFinite(uid) && uid > 0 ? uid : undefined;
  }

  if (!loginRequest.username) {
    return undefined;
  }

  try {
    const info = await tuanchat.userController.getUserInfoByUsername(loginRequest.username);
    const uid = info?.data?.userId;
    return typeof uid === "number" && uid > 0 ? uid : undefined;
  }
  catch {
    return undefined;
  }
}

/**
 * React Query key for the frontend authentication status snapshot.
 */
export function getAuthStatusQueryKey() {
  return ["authStatus"] as const;
}

export async function loginUser(
  credentials: UserLoginRequest,
  loginMethod: "username" | "userId",
) {
  try {
    const loginRequest: UserLoginRequest = {
      password: credentials.password,
    };

    // 根据登录方式设置对应的字段
    if (loginMethod === "username") {
      loginRequest.username = credentials.username;
    }
    else if (loginMethod === "userId") {
      loginRequest.userId = credentials.username; // 重用 username 字段存储 userId
    }

    const response = await tuanchat.userController.login(loginRequest);

    // Sa-Token：登录成功后返回 tokenValue，需要本地持久化
    if (response?.data) {
      resetTuanChatQueryCache();
      localStorage.setItem("token", response.data);
      persistUid(await resolveAuthenticatedUid(loginRequest, loginMethod));
      syncAuthStatusCache(buildLoggedInStatus(response.data, readStoredUid()));
      dispatchStoredAuthSessionChanged("login");
    }

    return response;
  }
  catch (error: any) {
    throw new Error(extractOpenApiErrorMessage(error, "登录失败"));
  }
}

export async function registerUser(credentials: UserRegisterRequest) {
  try {
    const response = await tuanchat.userController.register(credentials);

    return response;
  }
  catch (error: any) {
    throw new Error(extractOpenApiErrorMessage(error, "注册失败"));
  }
}

export async function checkAuthStatus() {
  const token = readStoredToken();
  if (!token) {
    return { isLoggedIn: false };
  }

  const storedUid = readStoredUid();

  try {
    const response = await tuanchat.userController.getMyUserInfo();
    const uid = typeof response?.data?.userId === "number" && response.data.userId > 0
      ? response.data.userId
      : storedUid;
    persistUid(uid);
    return buildLoggedInStatus(token, uid);
  }
  catch (error) {
    if (isUnauthorizedApiError(error)) {
      clearStoredAuthSession();
      return { isLoggedIn: false };
    }

    return buildLoggedInStatus(token, storedUid);
  }
}

export async function logoutUser() {
  const token = readStoredToken();
  // 先清理本地，保证 UI 立即生效
  clearStoredAuthSession();
  resetTuanChatQueryCache();
  syncAuthStatusCache({ isLoggedIn: false });
  dispatchStoredAuthSessionChanged("logout");

  if (!token)
    return;

  try {
    await tuanchat.userController.logout();
  }
  catch {
    // best-effort: 本地已登出即可
  }
}
