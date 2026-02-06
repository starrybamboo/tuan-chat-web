import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";

export default function RuleSelector({ value, onChange }: { value: number; onChange: any }) {
  const { data } = useGetRulePageInfiniteQuery({
    pageNo: 1,
    pageSize: 20,
  });

  // 合并预设规则和API规则
  const rules = data?.pages[0].data?.list || [];

  return (
    <aside className="flex-1/3 px-5">
      <p className="text-xl font-bold mb-5 text-lime-600">1. 选择一个规则</p>
      <div className="grid grid-rows-1 md:grid-rows-3 gap-4">
        {rules.map(rule => (
          <label
            key={rule.ruleId}
            className={`cursor-pointer border-2 rounded-xl p-2 transition-all duration-200 hover:scale-105
                          ${value === rule.ruleId
            ? "border-lime-700 bg-lime-500/10 shadow-lg"
            : "border-gray-300 dark:border-gray-500 bg-base-100 hover:border-lime-600"}
                      `}
          >
            <input
              type="radio"
              name="rule"
              value={rule.ruleId}
              checked={value === rule.ruleId}
              onChange={() => {
                onChange("ruleId", rule.ruleId);
              }}
              className="hidden"
            />
            <div className="flex flex-col items-start">
              <span className="text-lime-700">{rule.ruleName}</span>
              <span className="text-sm text-base-content/70 mt-1">{rule.ruleDescription}</span>
            </div>
          </label>
        ))}
      </div>
    </aside>
  );
}
