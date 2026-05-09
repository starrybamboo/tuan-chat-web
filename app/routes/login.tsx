import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import LoginModal from "@/components/auth/LoginModal";
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

export default function LoginPage() {
  const location = useLocation();
  const router = useRouter();
  const searchParams = new URLSearchParams(location.searchStr);
  const redirect = normalizeAuthRedirectPath(searchParams.get("redirect"));
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setIsOpen(true));
  }, [redirect]);

  return (
    <div className="min-h-screen bg-base-200">
      <LoginModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          router.history.replace(redirect);
        }}
      />
    </div>
  );
}
