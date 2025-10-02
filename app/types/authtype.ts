export type LoginCredentials = {
  username: string;
  password: string;
};

export type RegisterCredentials = {
  username: string;
  password: string;
};

export type RegisterResponse = {
  success: boolean;
  message?: string;
  errMsg?: string;
  data?: string;
  token?: string;
};
