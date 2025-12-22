import type { UserLoginRequest, UserRegisterRequest } from "api";

import { tuanchat } from "../../../api/instance";

// 获取错误信息的优先级：
// 1. error 对象中的 body.errMsg
// 2. error 对象的 message
// 3. 默认错误信息

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
      localStorage.setItem("token", response.data);

      // 由于 tokenValue 无法反推出 uid，这里额外缓存 uid
      if (loginMethod === "userId") {
        const uid = Number(loginRequest.userId);
        if (!Number.isNaN(uid) && uid > 0) {
          localStorage.setItem("uid", String(uid));
        }
      }
      else if (loginMethod === "username" && loginRequest.username) {
        try {
          const info = await tuanchat.userController.getUserInfoByUsername(loginRequest.username);
          const uid = info?.data?.userId;
          if (typeof uid === "number" && uid > 0) {
            localStorage.setItem("uid", String(uid));
          }
        }
        catch {
          // best-effort: uid 获取失败不影响 token 登录态
        }
      }
    }

    return response;
  }
  catch (error: any) {
    const errorMessage
      = error.body?.errMsg
        || error.message
        || "登录失败";
    throw new Error(errorMessage);
  }
}

export async function registerUser(credentials: UserRegisterRequest) {
  try {
    const response = await tuanchat.userController.register(credentials);

    return response;
  }
  catch (error: any) {
    const errorMessage
      = error.body?.errMsg
        || error.message
        || "注册失败";

    throw new Error(errorMessage);
  }
}

export async function checkAuthStatus() {
  const token = localStorage.getItem("token");
  if (!token) {
    return { isLoggedIn: false };
  }
  const uidRaw = localStorage.getItem("uid");
  const uid = uidRaw && !Number.isNaN(Number(uidRaw)) ? Number(uidRaw) : undefined;
  return { isLoggedIn: true, token, uid };
}

export async function logoutUser() {
  const token = localStorage.getItem("token");
  // 先清理本地，保证 UI 立即生效
  localStorage.removeItem("token");
  localStorage.removeItem("uid");

  if (!token)
    return;

  // 最小实现：不依赖 OpenAPI 代码生成是否已同步到 /user/logout
  // 后端按 Sa-Token 处理 Authorization: Bearer <token>
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    await fetch(`${base}/user/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
  }
  catch {
    // best-effort: 本地已登出即可
  }
}
