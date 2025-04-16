// RulesSection.tsx
import type { GameRule } from "./types";

interface RulesSectionProps {
  rules: GameRule[];
  currentRuleId: string;
  onRuleChange: (ruleId: string) => void;
}

/**
 * 规则选择组件
 * 用于选择角色使用的游戏规则系统，如COC、DND等
 * 每种规则系统决定了角色的表演字段和数值约束
 */
export default function RulesSection({
  rules,
  currentRuleId,
  onRuleChange,
}: RulesSectionProps) {
  return (
    <div className="space-y-4 p-4 bg-base-200 rounded-lg">
      <div className="flex items-center gap-4">
        <select
          className="select select-bordered flex-1"
          value={currentRuleId}
          onChange={e => onRuleChange(e.target.value)}
        >
          {rules.map(rule => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </div>

      {/* 当前规则描述 */}
      {rules.length > 0 && (
        <div className="text-sm opacity-75">
          {rules.find(r => r.id === currentRuleId)?.description}
        </div>
      )}
    </div>
  );
}
