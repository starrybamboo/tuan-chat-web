import type { LoginCredentials, RegisterCredentials } from "../../types/authtype";

import { tuanchat } from "../../../api/instance";

export async function loginUser(credentials: LoginCredentials) {
  const response = await tuanchat.service.login({
    userId: credentials.username,
    password: credentials.password,
  });

  if (!response.success) {
    throw new Error(response.errMsg || "登录失败");
  }

  return response;
}

export async function registerUser(credentials: RegisterCredentials) {
  const response = await tuanchat.service.register({
    username: credentials.username,
    password: credentials.password,
  });

  if (!response.success) {
    throw new Error(response.errMsg || "注册失败");
  }

  return response;
}

export async function checkAuthStatus() {
  const token = localStorage.getItem("token");
  if (!token) {
    return { isLoggedIn: false };
  }
  return { isLoggedIn: true, token };
}
