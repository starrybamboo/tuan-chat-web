import type { Rule } from "@tuanchat/openapi-client/models/Rule";
import type { RoleConfigTabKey } from "../rules/configTabMeta";
import { MaskHappyIcon } from "@phosphor-icons/react";
import { useCallback, useState } from "react";
import Section from "../Editors/Section";
import { ROLE_CONFIG_TAB_ITEMS } from "../rules/configTabMeta";
import { RuleConfigurationSection } from "./RuleConfigurationSection";
import RulePerformanceEditor from "./RulePerformanceEditor";

export default function RuleExpansionModule({
  localRule,
  onRuleChange,
  cloneVersion,
  onModuleEditingChange,
  forcedEditing,
  saveSignal,
}: {
  localRule: Rule;
  onRuleChange: React.Dispatch<React.SetStateAction<Rule>>;
  cloneVersion: number;
  onModuleEditingChange?: (moduleKey: string, editing: boolean) => void;
  forcedEditing?: boolean;
  saveSignal?: number;
}) {
  const [activeTab, setActiveTab] = useState<RoleConfigTabKey>("basic");

  const handleBasicEditingChange = useCallback(
    (editing: boolean) => onModuleEditingChange?.("basic", editing),
    [onModuleEditingChange],
  );

  const handleAbilityEditingChange = useCallback(
    (editing: boolean) => onModuleEditingChange?.("ability", editing),
    [onModuleEditingChange],
  );

  const handleSkillEditingChange = useCallback(
    (editing: boolean) => onModuleEditingChange?.("skill", editing),
    [onModuleEditingChange],
  );

  const handleActEditingChange = useCallback(
    (editing: boolean) => onModuleEditingChange?.("act", editing),
    [onModuleEditingChange],
  );

  // 处理基础属性变更
  const handleBasicChange = (newData: Record<string, any>) => {
    onRuleChange((prev: Rule) => ({ ...prev, basicDefault: newData }));
  };

  // 处理技能变更
  const handleSkillChange = (newData: Record<string, any>) => {
    onRuleChange((prev: Rule) => ({ ...prev, skillDefault: newData }));
  };

  // 处理能力变更
  const handleAbilityChange = (newData: Record<string, any>) => {
    onRuleChange((prev: Rule) => ({ ...prev, abilityFormula: newData }));
  };

  // 处理表演字段变更
  const handleActTemplateChange = (newData: Record<string, any>) => {
    onRuleChange((prev: Rule) => ({ ...prev, actTemplate: newData }));
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Tab 按钮条，依据角色类型条件渲染 */}
      <div className="flex gap-1 md:gap-2 rounded-lg">
        <>
          {ROLE_CONFIG_TAB_ITEMS.map(({ key, label, shortLabel, Icon }) => (
            <button
              key={key}
              type="button"
              className={`btn btn-md inline-flex items-center gap-1.5 rounded-lg ${activeTab === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon className="size-4 shrink-0" weight="bold" aria-hidden="true" />
              <span className="md:hidden">{shortLabel}</span>
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </>
      </div>

      <div className={activeTab === "basic" ? "block" : "hidden"} aria-hidden={activeTab !== "basic"}>
        <RuleConfigurationSection
          customLabel="基础属性"
          configKey="basic"
          localEdits={localRule.basicDefault}
          onDataChange={handleBasicChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleBasicEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      </div>

      <div className={activeTab === "ability" ? "block" : "hidden"} aria-hidden={activeTab !== "ability"}>
        <RuleConfigurationSection
          customLabel="能力"
          configKey="ability"
          localEdits={localRule.abilityFormula}
          onDataChange={handleAbilityChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleAbilityEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      </div>

      <div className={activeTab === "skill" ? "block" : "hidden"} aria-hidden={activeTab !== "skill"}>
        <RuleConfigurationSection
          customLabel="技能"
          configKey="skill"
          localEdits={localRule.skillDefault}
          onDataChange={handleSkillChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleSkillEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      </div>

      <div className={activeTab === "act" ? "block" : "hidden"} aria-hidden={activeTab !== "act"}>
        <Section
          className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
          collapsible={false}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MaskHappyIcon className="size-5 shrink-0 text-base-content/80" weight="bold" aria-hidden="true" />
              <h4 className="text-lg font-semibold">表演模版</h4>
              <div className="badge badge-info badge-sm">{Object.keys(localRule.actTemplate ?? {}).length}</div>
            </div>
            <RulePerformanceEditor
              title="表演"
              data={localRule.actTemplate}
              onSave={handleActTemplateChange}
              cloneVersion={cloneVersion}
              onEditingChange={handleActEditingChange}
              forcedEditing={forcedEditing}
              saveSignal={saveSignal}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
