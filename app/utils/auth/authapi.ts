import type { LoginCredentials, RegisterCredentials, RegisterResponse } from "../../types/authtype";

export async function loginUser(credentials: LoginCredentials) {
  const res = await fetch("http://39.103.58.31:8081/capi/user/public/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 10001",
    },
    body: JSON.stringify({
      userId: credentials.username,
      password: credentials.password,
    }),
  });

  if (!res.ok)
    throw new Error("登录失败");

  return await res.json();
}

export async function registerUser(credentials: RegisterCredentials) {
  const res = await fetch("http://39.103.58.31:8081/capi/user/public/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 10001",
    },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  const data: RegisterResponse = await res.json();

  if (!data.success) {
    throw new Error(data.errMsg || "注册失败");
  }

  return data;
}

export async function checkAuthStatus() {
  const token = localStorage.getItem("token");
  if (!token) {
    return { isLoggedIn: false };
  }
  return { isLoggedIn: true, token };
}
