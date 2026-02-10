import type { Rule } from "api/models/Rule";
import { useCallback, useState } from "react";
import Section from "../Editors/Section";
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
  const [activeTab, setActiveTab] = useState<"basic" | "ability" | "skill" | "act">("basic");

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

  // 渲染当前 Tab 内容
  const renderActiveTabContent = () => {
    if (activeTab === "basic") {
      return (
        <RuleConfigurationSection
          key="basic"
          customLabel="基础属性"
          localEdits={localRule.basicDefault}
          onDataChange={handleBasicChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleBasicEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      );
    }
    if (activeTab === "ability") {
      return (
        <RuleConfigurationSection
          key="ability"
          customLabel="能力"
          localEdits={localRule.abilityFormula}
          onDataChange={handleAbilityChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleAbilityEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      );
    }
    if (activeTab === "skill") {
      return (
        <RuleConfigurationSection
          key="skill"
          customLabel="技能"
          localEdits={localRule.skillDefault}
          onDataChange={handleSkillChange}
          cloneVersion={cloneVersion}
          onEditingChange={handleSkillEditingChange}
          forcedEditing={forcedEditing}
          saveSignal={saveSignal}
        />
      );
    }
    // act
    return (
      <Section
        key="act"
        className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100"
        collapsible={false}
      >
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-semibold">
              ⚡表演模版
            </h4>
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
    );
  };

  return (
    <div className="space-y-4">
      {/* 顶部 Tab 按钮条，依据角色类型条件渲染 */}
      <div className="flex gap-2 rounded-lg">
        <>
          <button
            type="button"
            className={`btn btn-md rounded-lg ${activeTab === "basic" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("basic")}
          >
            <span className="md:hidden">基础</span>
            <span className="hidden md:inline">基础配置</span>
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-lg ${activeTab === "ability" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("ability")}
          >
            <span className="md:hidden">能力</span>
            <span className="hidden md:inline">能力配置</span>
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-lg ${activeTab === "skill" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("skill")}
          >
            <span className="md:hidden">技能</span>
            <span className="hidden md:inline">技能配置</span>
          </button>
          <button
            type="button"
            className={`btn btn-md rounded-lg ${activeTab === "act" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setActiveTab("act")}
          >
            <span className="md:hidden">表演</span>
            <span className="hidden md:inline">表演配置</span>
          </button>
        </>
      </div>
      {renderActiveTabContent()}
    </div>
  );
}
