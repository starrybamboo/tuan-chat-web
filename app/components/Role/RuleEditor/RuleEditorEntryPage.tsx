import { Plus } from "@phosphor-icons/react";
import { useNavigate } from "react-router";

import { useGlobalContext } from "@/components/globalContextProvider";
import CreatePageHeader from "@/components/Role/RoleCreation/CreatePageHeader";
import RulesSection from "@/components/Role/rules/RulesSection";

interface RuleEditorEntryPageProps {
  onBack?: () => void;
}

export default function RuleEditorEntryPage({ onBack }: RuleEditorEntryPageProps) {
  const navigate = useNavigate();
  const { userId } = useGlobalContext();

  const handleCreate = () => {
    navigate("/role?type=rule&mode=create");
  };

  const handleEdit = (ruleId: number) => {
    navigate(`/role?type=rule&mode=edit&ruleId=${ruleId}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CreatePageHeader
        title="规则编辑器"
        description="先从全部规则中挑选，再管理我的规则模板"
        onBack={onBack}
        toolButtons={[
          {
            id: "create-rule",
            label: "创建新规则",
            icon: <Plus className="size-4" weight="bold" />,
            onClick: handleCreate,
            variant: "primary",
          },
        ]}
      />

      <div className="divider md:hidden" />

      <div className="grid grid-cols-1 gap-5">
        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 md:p-5 space-y-3">
            <RulesSection
              large={false}
              currentRuleId={0}
              autoSelectFirst={false}
              title="全部规则模板"
              description="选择任意规则进入编辑页"
              controlsInHeader
              pageSize={16}
              gridMode="four"
              dense
              onRuleChange={handleEdit}
            />
          </div>
        </div>

        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 md:p-5 space-y-3">
            <RulesSection
              large={false}
              currentRuleId={0}
              autoSelectFirst={false}
              title="我的规则模板"
              description="仅展示你创建的规则模板"
              controlsInHeader
              authorId={typeof userId === "number" && userId > 0 ? userId : undefined}
              pageSize={16}
              gridMode="two"
              dense
              onRuleChange={handleEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
