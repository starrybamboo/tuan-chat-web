import { useEffect, useState } from "react";
import LoginModal from "./LoginModal"; // 更新导入路径

export default function LoginButton({ autoOpen }: { autoOpen?: boolean }) {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      setIsLoginModalOpen(true);
    }
  }, [autoOpen]);

  return (
    <div>
      {/* 打开登录弹窗的按钮 */}
      <button
        type="button"
        onClick={() => setIsLoginModalOpen(true)}
        className="btn btn-primary"
      >
        登录/注册
      </button>

      {/* 登录弹窗组件 */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}
