import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";

import { LoginBrandIntro } from "@/components/auth/LoginBrandIntro";
import { LoginPageAuthPanel } from "@/components/auth/LoginModal";
import { normalizeAuthRedirectPath } from "@/utils/auth/redirect";
import { createSeoMeta } from "@/utils/seo";

export function meta() {
  return createSeoMeta({
    title: "登录",
    description: "登录或注册团剧共创账号。",
    path: "/login",
    index: false,
  });
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: meta(),
  }),
  component: LoginPage,
});

function LoginPage() {
  const location = useLocation();
  const router = useRouter();
  const searchParams = new URLSearchParams(location.searchStr);
  const redirect = normalizeAuthRedirectPath(searchParams.get("redirect"));
  const isMobileAuth = searchParams.get("from") === "mobile";

  return (
    <main className="h-[100dvh] min-h-screen overflow-y-auto bg-base-200 px-4 py-10 text-base-content sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl flex-col items-center justify-center gap-6">
        <LoginBrandIntro />

        <LoginPageAuthPanel
          mobileCallbackEnabled={isMobileAuth}
          onAuthenticated={() => {
            router.history.replace(redirect);
          }}
          onClose={() => {
            router.history.replace(redirect);
          }}
        />
      </div>
    </main>
  );
}
