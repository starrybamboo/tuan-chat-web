import { ChatCircleText } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import LoginModal from "./LoginModal";

export default function LoginButton({ autoOpen }: { autoOpen?: boolean }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      queueMicrotask(() => setIsLoginModalOpen(true));
    }
  }, [autoOpen]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsLoginModalOpen(true)}
        className="btn btn-primary gap-2"
      >
        <ChatCircleText className="size-4" weight="duotone" />
        登录 / 注册
      </button>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
