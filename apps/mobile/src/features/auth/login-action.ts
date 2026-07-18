import type { LoginMethod } from "./auth-session";

type SignInInput = {
  identifier: string;
  method: LoginMethod;
  password: string;
};

type ExecuteLoginActionInput = {
  identifier: string;
  loginMethod: LoginMethod;
  password: string;
  replace: (href: "/(tabs)") => void;
  signIn: (input: SignInInput) => Promise<void>;
};

/**
 * Runs the mobile login submission flow and navigates into the tab shell only
 * after the session has been established successfully.
 */
export async function executeLoginAction({
  identifier,
  loginMethod,
  password,
  replace,
  signIn,
}: ExecuteLoginActionInput) {
  await signIn({ identifier, method: loginMethod, password });
  replace("/(tabs)");
}
