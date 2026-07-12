import { useEffect, useState } from "react";

import { Button } from "@/components/common/Button";
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
      <Button
        variant="primary"
        icon={<RoomChatIcon className="size-4" />}
        className="gap-2"
        onClick={() => setIsLoginModalOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isLoginModalOpen}
      >
        登录 / 注册
      </Button>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
