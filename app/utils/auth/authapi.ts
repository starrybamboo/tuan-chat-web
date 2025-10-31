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
  return { isLoggedIn: true, token };
}
