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
      <p className="text-xl font-bold mb-5 text-info">1. 选择一个规则</p>
      <div className="
        grid grid-rows-1
        md:grid-rows-3
        gap-4
      ">
        {rules.map(rule => (
          <label
            key={rule.ruleId}
            className={`
              cursor-pointer border-2 rounded-xl p-2 transition-all duration-200
              hover:scale-105
              focus-within:ring-2 focus-within:ring-info/30
              ${value === rule.ruleId
            ? "border-info bg-info/10 shadow-lg"
            : `
              border-base-300
              dark:border-base-content/20
              bg-base-100
              hover:border-info
            `}
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
              className="sr-only"
            />
            <div className="flex flex-col items-start">
              <span className={value === rule.ruleId ? "text-info" : "text-base-content"}>
                {rule.ruleName}
              </span>
              <span className="text-sm text-base-content/70 mt-1">{rule.ruleDescription}</span>
            </div>
          </label>
        ))}
      </div>
    </aside>
  );
}
