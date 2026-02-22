type ApiResultPayload<T = unknown> = {
  success?: boolean;
  code?: number;
  errMsg?: string;
  message?: string;
  data?: T;
};

type RequestOptions = {
  authenticated?: boolean;
};

export type EmailVerificationPurpose
  = | "REGISTER"
    | "CHANGE_PASSWORD"
    | "BIND_EMAIL"
    | "CHANGE_EMAIL_OLD"
    | "CHANGE_EMAIL_NEW";

type SendEmailVerificationCodeParams = {
  email: string;
  purpose: EmailVerificationPurpose;
  authenticated?: boolean;
};

type VerifyEmailVerificationCodeParams = {
  email: string;
  code: string;
  purpose: EmailVerificationPurpose;
  authenticated?: boolean;
};

type ChangePasswordByEmailParams = {
  email: string;
  code: string;
  newPassword: string;
};

type BindEmailParams = {
  email: string;
  code: string;
};

type ChangeEmailParams = {
  oldEmail: string;
  oldCode: string;
  newEmail: string;
  newCode: string;
};

function resolveBaseUrl(): string {
  const envBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (envBase.length > 0) {
    return envBase.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }
  return "";
}

function readConfiguredPath(envKey: string, fallback: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const configured = env[envKey]?.trim();
  if (!configured) {
    return fallback;
  }
  return configured.startsWith("/") ? configured : `/${configured}`;
}

const SECURITY_ENDPOINTS = {
  sendEmailCode: readConfiguredPath(
    "VITE_SECURITY_SEND_EMAIL_CODE_PATH",
    "/user/security/email/code/send",
  ),
  verifyEmailCode: readConfiguredPath(
    "VITE_SECURITY_VERIFY_EMAIL_CODE_PATH",
    "/user/security/email/code/verify",
  ),
  forgotPassword: readConfiguredPath(
    "VITE_SECURITY_FORGOT_PASSWORD_PATH",
    "/user/security/password/forgot",
  ),
  changePassword: readConfiguredPath(
    "VITE_SECURITY_CHANGE_PASSWORD_PATH",
    "/user/security/password/change",
  ),
  bindEmail: readConfiguredPath(
    "VITE_SECURITY_BIND_EMAIL_PATH",
    "/user/security/email/bind",
  ),
  changeEmail: readConfiguredPath(
    "VITE_SECURITY_CHANGE_EMAIL_PATH",
    "/user/security/email/change",
  ),
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readErrorText(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    const errMsg = payload.errMsg;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }
    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

async function requestSecurityApi<T>(
  path: string,
  body: Record<string, unknown>,
  options: RequestOptions = {},
): Promise<T | undefined> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  if (options.authenticated && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(readErrorText(payload, `请求失败 (${response.status})`));
  }

  if (isRecord(payload)) {
    const result = payload as ApiResultPayload<T>;
    if (result.success === false) {
      throw new Error(readErrorText(payload, "请求失败"));
    }
    return result.data;
  }

  return undefined;
}

export function sendEmailVerificationCode(params: SendEmailVerificationCodeParams) {
  return requestSecurityApi<void>(
    SECURITY_ENDPOINTS.sendEmailCode,
    {
      email: params.email,
      purpose: params.purpose,
    },
    { authenticated: params.authenticated },
  );
}

export function verifyEmailVerificationCode(params: VerifyEmailVerificationCodeParams) {
  return requestSecurityApi<void>(
    SECURITY_ENDPOINTS.verifyEmailCode,
    {
      email: params.email,
      code: params.code,
      purpose: params.purpose,
    },
    { authenticated: params.authenticated },
  );
}

export function requestForgotPasswordByEmail(email: string) {
  return requestSecurityApi<void>(SECURITY_ENDPOINTS.forgotPassword, { email });
}

export function changePasswordByEmailVerification(params: ChangePasswordByEmailParams) {
  return requestSecurityApi<void>(
    SECURITY_ENDPOINTS.changePassword,
    {
      email: params.email,
      code: params.code,
      newPassword: params.newPassword,
    },
    { authenticated: true },
  );
}

export function bindEmailByVerification(params: BindEmailParams) {
  return requestSecurityApi<void>(
    SECURITY_ENDPOINTS.bindEmail,
    {
      email: params.email,
      code: params.code,
    },
    { authenticated: true },
  );
}

export function changeEmailByVerification(params: ChangeEmailParams) {
  return requestSecurityApi<void>(
    SECURITY_ENDPOINTS.changeEmail,
    {
      oldEmail: params.oldEmail,
      oldCode: params.oldCode,
      newEmail: params.newEmail,
      newCode: params.newCode,
    },
    { authenticated: true },
  );
}
