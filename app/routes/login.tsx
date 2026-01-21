import LoginModal from "@/components/auth/LoginModal";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export function meta() {
  return [
    { title: "登录 - tuan-chat" },
    { name: "description", content: "登录/注册" },
  ];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/chat";
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsOpen(true);
  }, [redirect]);

  return (
    <div className="min-h-screen bg-base-200">
      <LoginModal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          navigate(redirect, { replace: true });
        }}
      />
    </div>
  );
}

