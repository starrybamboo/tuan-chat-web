import type { LoginCredentials, RegisterCredentials } from "../../types/authtype";

import { tuanchat } from "../../../api/instance";

// 获取错误信息的优先级：
// 1. error 对象中的 body.errMsg
// 2. error 对象的 message
// 3. 默认错误信息

export async function loginUser(credentials: LoginCredentials) {
  try {
    const response = await tuanchat.userController.login({
      userId: credentials.username,
      password: credentials.password,
    });

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

export async function registerUser(credentials: RegisterCredentials) {
  try {
    const response = await tuanchat.userController.register({
      username: credentials.username,
      password: credentials.password,
    });

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
