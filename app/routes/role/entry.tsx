import type { Role } from "@/components/newCharacter/types";
import AICreateRole from "@/components/newCharacter/RoleCreation/AICreateRole";
// 导入您的创建组件
import CreateEntry from "@/components/newCharacter/RoleCreation/CreateEntry";

import CreateRoleBySelf from "@/components/newCharacter/RoleCreation/CreateRoleBySelf";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router";

interface RoleContext {
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
}

export default function RoleCreationPage() {
  // 注意：我们甚至不需要从 context 中解构 roles，因为用不到它
  const { setRoles } = useOutletContext<RoleContext>();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"self" | "AI" | "excel" | "entry">("entry");

  // 当一个角色被创建并保存后，导航到它的详情页
  const handleCreationComplete = (newRole: Role, ruleId?: number) => {
    // 这里我们可以手动更新一下 roles 状态，以便 Sidebar 立即显示新角色
    setRoles(prevRoles => [newRole, ...prevRoles]);
    // 如果提供了规则ID，则导航到具体规则页面，否则导航到角色详情页
    if (ruleId) {
      navigate(`/role/${newRole.id}?rule=${ruleId}`);
    }
    else {
      navigate(`/role/${newRole.id}`);
    }
  };

  // 根据 mode 返回不同的创建组件
  if (mode === "self") {
    return (
      <CreateRoleBySelf
        onBack={() => setMode("entry")}
        onComplete={handleCreationComplete}
      />
    );
  }
  if (mode === "AI") {
    return <AICreateRole onBack={() => setMode("entry")} onComplete={handleCreationComplete} />;
  }

  // 默认渲染创建入口
  return (
    <CreateEntry
      AICreate={() => setMode("AI")}
      createBySelf={() => setMode("self")}
    />
  );
}
