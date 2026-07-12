import { Plus } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { useGetRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useRef, useState } from "react";

import { useGlobalUserId } from "@/components/globalContextProvider";
import { Button } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { FieldDescription, FieldGroup, TextArea, TextInput } from "@/components/common/FormField";
import CreatePageHeader from "@/components/Role/RoleCreation/CreatePageHeader";
import RulesSection from "@/components/Role/rules/RulesSection";

type RuleEditorEntryPageProps = {
  onBack?: () => void;
}

const RULE_NAME_MAX_LENGTH = 20;
const RULE_DESCRIPTION_MAX_LENGTH = 200;

type RuleScope = "all" | "mine";

export default function RuleEditorEntryPage({ onBack }: RuleEditorEntryPageProps) {
  const router = useRouter();
  const userId = useGlobalUserId();
  const [scope, setScope] = useState<RuleScope>("all");
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [selectedTemplateRuleId, setSelectedTemplateRuleId] = useState(0);
  const selectedTemplateRuleQuery = useGetRuleDetailQuery(selectedTemplateRuleId);
  const appliedTemplateIdRef = useRef(0);

  const trimmedRuleName = ruleName.trim();
  const trimmedRuleDescription = ruleDescription.trim();
  const canCreate = trimmedRuleName.length > 0 && trimmedRuleDescription.length > 0;
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

    router.history.push("/role?type=rule&mode=create", {
      prefillRuleName: trimmedRuleName,
      prefillRuleDescription: trimmedRuleDescription,
      prefillTemplateRuleId: selectedTemplateRuleId > 0 ? selectedTemplateRuleId : undefined,
      skipCreateBaseInfo: true,
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

    queueMicrotask(() => setRuleName((templateRule.ruleName ?? "").trim()));
    queueMicrotask(() => setRuleDescription((templateRule.ruleDescription ?? "").trim()));
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
            icon: <Plus className="size-4" weight="regular" />,
            onClick: handleCreate,
            disabled: !canCreate,
            variant: "primary",
          },
        ]}
      />

      <div className="
        md:hidden
        mb-4 space-y-2
      ">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <span aria-hidden="true">←</span>
                返回上一步
              </Button>
            )}
            <h1 className="font-semibold text-xl">创建规则</h1>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="rounded-lg md:h-12 md:min-h-12 md:px-6 md:text-lg"
            onClick={handleCreate}
            disabled={!canCreate}
            title={canCreate ? "创建新规则" : "请先填写规则名称和规则描述"}
          >
            <span className="flex items-center gap-1">
              <Plus className="size-4" weight="regular" />
              创建新规则
            </span>
          </Button>
        </div>
        <p className="text-sm text-base-content/60">创建规则作为角色能力的模板值</p>
      </div>

      <div className="grid grid-cols-1 gap-5">
        <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 shadow-xs" })}>
          <div className="
            p-4
            md:p-5
            space-y-3
          ">
            <h2 className="mb-2 flex items-center gap-2 text-component-title font-medium">基础信息设置</h2>

            <div className="space-y-4">
              <FieldGroup>
                <div className="flex gap-2 mb-2 items-center font-semibold">
                  <label htmlFor="rule-editor-entry-name">规则名称</label>
                  <FieldDescription as="span">
                    {ruleName.length}
                    /
                    {RULE_NAME_MAX_LENGTH}
                  </FieldDescription>
                </div>
                <TextInput
                  surface="muted"
                  id="rule-editor-entry-name"
                  type="text"
                  autoComplete="off"
                  aria-label="规则名称"
                  placeholder="输入规则名称"
                  value={ruleName}
                  maxLength={RULE_NAME_MAX_LENGTH}
                  onChange={e => setRuleName(e.target.value)}
                />
              </FieldGroup>

              <FieldGroup>
                <div className="flex gap-2 mb-2 items-center font-semibold">
                  <label htmlFor="rule-editor-entry-description">规则描述</label>
                  <FieldDescription as="span">
                    {ruleDescription.length}
                    /
                    {RULE_DESCRIPTION_MAX_LENGTH}
                  </FieldDescription>
                </div>
                <TextArea
                  surface="muted"
                  id="rule-editor-entry-description"
                  className="min-h-[120px]"
                  autoComplete="off"
                  aria-label="规则描述"
                  placeholder="描述规则定位、核心机制和适用场景"
                  value={ruleDescription}
                  maxLength={RULE_DESCRIPTION_MAX_LENGTH}
                  onChange={e => setRuleDescription(e.target.value)}
                />
              </FieldGroup>
            </div>
          </div>
        </div>

        <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 shadow-xs" })}>
          <div className="
            p-4
            md:p-5
            space-y-3
          ">
            <div className="
              flex items-center gap-2 rounded-lg bg-base-200 p-1 w-fit
            ">
              <Button
                variant={scope === "all" ? "outline" : "ghost"}
                size="sm"
                className={`rounded-md ${scope === "all" ? "border-info/45 text-info hover:border-info/70 hover:bg-info/10" : ""}`}
                onClick={() => setScope("all")}
                aria-pressed={scope === "all"}
              >
                全部规则模板
              </Button>
              <Button
                variant={scope === "mine" ? "outline" : "ghost"}
                size="sm"
                className={`rounded-md ${scope === "mine" ? "border-info/45 text-info hover:border-info/70 hover:bg-info/10" : ""}`}
                onClick={() => setScope("mine")}
                aria-pressed={scope === "mine"}
              >
                我的规则模板
              </Button>
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
