import type { LoginMethod } from "./auth-session";

type LoginRouter = {
  replace: (href: "/(tabs)") => void;
};

type SignInInput = {
  identifier: string;
  method: LoginMethod;
  password: string;
};

type ExecuteLoginActionInput = {
  identifier: string;
  loginMethod: LoginMethod;
  password: string;
  router: LoginRouter;
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
  router,
  signIn,
}: ExecuteLoginActionInput) {
  await signIn({ identifier, method: loginMethod, password });
  router.replace("/(tabs)");
}
