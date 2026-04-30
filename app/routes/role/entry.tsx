import type { Role } from "@/components/Role/types";
import { useNavigate, useSearchParams } from "react-router";

import CreateDiceMaiden from "@/components/Role/RoleCreation/CreateDicerRole";
import CreateEntry from "@/components/Role/RoleCreation/CreateEntry";
import CreateRoleBySelf from "@/components/Role/RoleCreation/CreateRoleBySelf";
import RuleEditorRoute from "@/components/Role/RuleEditor/RuleEditorRoute";
import { setRoleRule } from "@/utils/roleRuleStorage";

type CreateMode = "normal" | "dice" | "rule" | "entry";

function resolveCreateMode(typeParam: string | null): CreateMode {
  if (typeParam === "normal" || typeParam === "dice" || typeParam === "rule") {
    return typeParam;
  }
  return "entry";
}

export default function RoleCreationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = resolveCreateMode(searchParams.get("type"));

  const handleBackToEntry = () => {
    navigate("/role");
  };

  // 当一个角色被创建并保存后，导航到它的详情页
  const handleCreationComplete = (newRole: Role, ruleId?: number) => {
    const resolvedRuleId = ruleId || 1;
    setRoleRule(newRole.id, resolvedRuleId);
    navigate(`/role/${newRole.id}?rule=${resolvedRuleId}`);
  };

  // 根据 mode 返回不同的创建组件
  if (mode === "normal") {
    return (
      <CreateRoleBySelf
        onBack={handleBackToEntry}
        onComplete={handleCreationComplete}
      />
    );
  }
  if (mode === "dice") {
    return (
      <CreateDiceMaiden
        onBack={handleBackToEntry}
        onComplete={handleCreationComplete}
      />
    );
  }
  if (mode === "rule") {
    return <RuleEditorRoute onBack={handleBackToEntry} />;
  }

  // 默认渲染创建入口
  return <CreateEntry />;
}
