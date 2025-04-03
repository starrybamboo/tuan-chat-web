export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  password: string;
};

export type AuthResponse = {
  success: boolean;
  message?: string;
  data?: string;
  token?: string;
};
