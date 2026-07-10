import { useEffect, useState } from "react";

import { RoomChatIcon } from "@/icons";

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
        aria-haspopup="dialog"
        aria-expanded={isLoginModalOpen}
      >
        <RoomChatIcon className="size-4" />
        登录 / 注册
      </button>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
