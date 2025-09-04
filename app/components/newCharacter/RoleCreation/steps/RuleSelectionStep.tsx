import type { RuleSystem } from "../types";

interface RuleSelectionStepProps {
  ruleSystems: RuleSystem[];
  selectedRuleSystem: string;
  onRuleSystemChange: (ruleSystemId: string) => void;
}

export default function RuleSelectionStep({
  ruleSystems,
  selectedRuleSystem,
  onRuleSystemChange,
}: RuleSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2">
            ⚙️ 选择规则系统
          </h3>
          <div className="grid gap-4 mt-4">
            {ruleSystems.map(rule => (
              <div
                key={rule.id}
                className={`card cursor-pointer transition-all shadow-xs rounded-2xl border ${
                  selectedRuleSystem === rule.id
                    ? "border-primary ring-2 ring-primary bg-primary/5"
                    : "border-base-300 hover:border-base-400 hover:bg-base-200/60"
                }`}
                onClick={() => onRuleSystemChange(rule.id)}
              >
                <div className="card-body p-5 md:p-6 min-h-[128px]">
                  <div className="flex h-full items-center justify-between gap-4 md:gap-6">
                    <div>
                      <h4 className="font-medium text-base">{rule.name}</h4>
                      <p className="text-sm text-base-content/70">{rule.description}</p>
                    </div>
                    {selectedRuleSystem === rule.id && (
                      <div className="badge badge-primary badge-sm md:badge-md">已选择</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
