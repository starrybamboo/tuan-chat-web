import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";

import type { Role } from "@/components/Role/types";

import CreateDiceMaiden from "@/components/Role/RoleCreation/CreateDicerRole";
import CreateEntry from "@/components/Role/RoleCreation/CreateEntry";
import RoleCreationFlow from "@/components/Role/RoleCreation/RoleCreationFlow";
import RoleTrashPage from "@/components/Role/RoleTrashPage";
import RuleEditorRoute from "@/components/Role/RuleEditor/RuleEditorRoute";
import { setRoleRule } from "@/utils/roleRuleStorage";

type CreateMode = "normal" | "dice" | "rule" | "entry";

function resolveCreateMode(typeParam: string | null): CreateMode {
  if (typeParam === "normal" || typeParam === "dice" || typeParam === "rule") {
    return typeParam;
  }
  return "entry";
}

export const Route = createFileRoute("/_dashboard/role/")({
  component: RoleCreationPage,
});

function RoleCreationPage() {
  const location = useLocation();
  const router = useRouter();
  const searchParams = new URLSearchParams(location.searchStr);
  const isTrashMode = searchParams.has("trash");
  const mode = resolveCreateMode(searchParams.get("type"));

  const handleBackToEntry = () => {
    router.history.push("/role");
  };

  // 当一个角色被创建并保存后，导航到它的详情页
  const handleCreationComplete = (newRole: Role, ruleId?: number) => {
    const resolvedRuleId = ruleId || 1;
    setRoleRule(newRole.id, resolvedRuleId);
    router.history.push(`/role/${newRole.id}?rule=${resolvedRuleId}`);
  };

  if (isTrashMode) {
    return <RoleTrashPage />;
  }

  // 根据 mode 返回不同的创建组件
  if (mode === "normal") {
    return (
      <RoleCreationFlow
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
