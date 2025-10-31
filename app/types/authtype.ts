import type { UserLoginRequest, UserRegisterRequest } from "api";

export type { UserLoginRequest, UserRegisterRequest };

export type RegisterResponse = {
  success: boolean;
  message?: string;
  errMsg?: string;
  data?: string;
  token?: string;
};
