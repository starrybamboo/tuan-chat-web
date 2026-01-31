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
        description="新建或编辑自定义规则"
        onBack={onBack}
      />

      <div className="divider md:hidden" />

      <div className="grid grid-cols-1 gap-6">
        {/* 新建模块 */}
        <button
          type="button"
          onClick={handleCreate}
          className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10 hover:bg-base-200/40 transition-all cursor-pointer text-left"
        >
          <div className="card-body p-5 md:p-6">
            <div>
              <div className="font-semibold text-base md:text-lg">新建规则</div>
              <div className="text-sm text-base-content/60">从空白创建一套规则</div>
            </div>
          </div>
        </button>

        {/* 编辑模块 */}
        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-5 md:p-6 space-y-4">
            <div>
              <div className="font-semibold text-base md:text-lg">编辑我的规则</div>
              <div className="text-sm text-base-content/60">选择已有规则进行编辑</div>
            </div>
            <RulesSection
              large={false}
              currentRuleId={0}
              autoSelectFirst={false}
              authorId={typeof userId === "number" && userId > 0 ? userId : undefined}
              onRuleChange={handleEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
