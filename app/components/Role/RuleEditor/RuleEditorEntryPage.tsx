import { Plus } from "@phosphor-icons/react";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useGlobalContext } from "@/components/globalContextProvider";
import CreatePageHeader from "@/components/Role/RoleCreation/CreatePageHeader";
import RulesSection from "@/components/Role/rules/RulesSection";

interface RuleEditorEntryPageProps {
  onBack?: () => void;
}

const RULE_NAME_MAX_LENGTH = 20;
const RULE_DESCRIPTION_MAX_LENGTH = 200;

type RuleScope = "all" | "mine";

export default function RuleEditorEntryPage({ onBack }: RuleEditorEntryPageProps) {
  const navigate = useNavigate();
  const { userId } = useGlobalContext();
  const [scope, setScope] = useState<RuleScope>("all");
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [selectedTemplateRuleId, setSelectedTemplateRuleId] = useState(0);
  const selectedTemplateRuleQuery = useGetRuleDetailQuery(selectedTemplateRuleId);
  const appliedTemplateIdRef = useRef(0);

  const canCreate = ruleName.trim().length > 0 && ruleDescription.trim().length > 0;
  const mineAuthorId = typeof userId === "number" && userId > 0 ? userId : undefined;
  const effectiveAuthorId = scope === "mine" ? mineAuthorId : undefined;
  const scopeTitle = scope === "all" ? "全部规则模板" : "我的规则模板";
  const scopeDescription = useMemo(() => {
    if (scope === "all") {
      return "选择规则作为创建默认值";
    }
    if (mineAuthorId) {
      return "选择你创建的规则作为默认值";
    }
    return "未登录，暂无法展示你的规则模板";
  }, [mineAuthorId, scope]);

  const handleCreate = () => {
    if (!canCreate) {
      return;
    }

    navigate("/role?type=rule&mode=create", {
      state: {
        prefillRuleName: ruleName.trim(),
        prefillRuleDescription: ruleDescription.trim(),
        prefillTemplateRuleId: selectedTemplateRuleId > 0 ? selectedTemplateRuleId : undefined,
        skipCreateBaseInfo: true,
      },
    });
  };

  const handleSelectTemplate = (ruleId: number) => {
    setSelectedTemplateRuleId(ruleId);
  };

  useEffect(() => {
    if (!selectedTemplateRuleId || !selectedTemplateRuleQuery.isSuccess) {
      return;
    }

    if (appliedTemplateIdRef.current === selectedTemplateRuleId) {
      return;
    }

    const templateRule = selectedTemplateRuleQuery.data?.data;
    if (!templateRule) {
      return;
    }

    setRuleName((templateRule.ruleName ?? "").trim());
    setRuleDescription((templateRule.ruleDescription ?? "").trim());
    appliedTemplateIdRef.current = selectedTemplateRuleId;
  }, [selectedTemplateRuleId, selectedTemplateRuleQuery.data, selectedTemplateRuleQuery.isSuccess]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CreatePageHeader
        title="创建规则"
        description="创建规则作为角色能力的模板值"
        onBack={onBack}
        toolButtons={[
          {
            id: "create-rule-from-basic",
            label: "创建新规则",
            icon: <Plus className="size-4" weight="bold" />,
            onClick: handleCreate,
            disabled: !canCreate,
            variant: "primary",
          },
        ]}
      />

      <div className="md:hidden mb-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={onBack}>
                ← 返回
              </button>
            )}
            <h1 className="font-semibold text-xl">创建规则</h1>
          </div>
          <button
            type="button"
            className="btn btn-sm md:btn-lg rounded-lg btn-primary"
            onClick={handleCreate}
            disabled={!canCreate}
          >
            <span className="flex items-center gap-1">
              <Plus className="size-4" weight="bold" />
              创建新规则
            </span>
          </button>
        </div>
        <p className="text-sm text-base-content/60">创建规则作为角色能力的模板值</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 md:p-5 space-y-3">
            <h2 className="card-title flex items-center gap-2 mb-2">基础信息设置</h2>

            <div className="space-y-4">
              <div className="form-control">
                <div className="flex gap-2 mb-2 items-center font-semibold">
                  <span>规则名称</span>
                  <span className="label-text-alt text-base-content/60">
                    {ruleName.length}
                    /
                    {RULE_NAME_MAX_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  className="input input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="输入规则名称"
                  value={ruleName}
                  maxLength={RULE_NAME_MAX_LENGTH}
                  onChange={e => setRuleName(e.target.value)}
                />
              </div>

              <div className="form-control">
                <div className="flex gap-2 mb-2 items-center font-semibold">
                  <span>规则描述</span>
                  <span className="label-text-alt text-base-content/60">
                    {ruleDescription.length}
                    /
                    {RULE_DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
                <textarea
                  className="textarea textarea-bordered bg-base-200 rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="描述规则定位、核心机制和适用场景"
                  value={ruleDescription}
                  maxLength={RULE_DESCRIPTION_MAX_LENGTH}
                  onChange={e => setRuleDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-base-200 p-1 w-fit">
              <button
                type="button"
                className={`btn btn-sm rounded-md ${scope === "all" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setScope("all")}
              >
                全部规则模板
              </button>
              <button
                type="button"
                className={`btn btn-sm rounded-md ${scope === "mine" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setScope("mine")}
              >
                我的规则模板
              </button>
            </div>

            <RulesSection
              large={false}
              currentRuleId={selectedTemplateRuleId}
              autoSelectFirst={false}
              title={scopeTitle}
              description={scopeDescription}
              controlsInHeader
              authorId={effectiveAuthorId}
              pageSize={16}
              gridMode="four"
              dense
              showRuleId={false}
              onRuleChange={handleSelectTemplate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
