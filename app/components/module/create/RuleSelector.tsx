import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";

const beforeSetRules = [
  { id: 1, name: "COC7版", desc: "克苏鲁神话，推理与恐怖" },
  { id: 2, name: "OC专用规则", desc: "自定义玩法，灵活自由" },
  { id: 4, name: "DND5e", desc: "经典奇幻规则，适合冒险与探索" },
];

export default function RuleSelector({ value, onChange }: { value: number; onChange: (id: number) => void }) {
  const { data, isLoading, isSuccess } = useGetRulePageInfiniteQuery({
    pageNo: 1,
    pageSize: 20,
  });

  // 合并预设规则和API规则
  const rules = [...beforeSetRules];

  if (!isLoading && isSuccess && data?.pages?.[0]?.data?.list) {
    const apiRules = data.pages[0].data.list;
    const presetIds = beforeSetRules.map(r => r.id);

    apiRules.forEach((apiRule) => {
      if (apiRule.ruleId && !presetIds.includes(apiRule.ruleId)) {
        rules.push({
          id: apiRule.ruleId,
          name: apiRule.ruleName || `规则${apiRule.ruleId}`,
          desc: apiRule.ruleDescription || "无描述",
        });
      }
    });
  }

  return (
    <div className="grid grid-rows-1 md:grid-rows-3 gap-4">
      {rules.map(rule => (
        <label
          key={rule.id}
          className={`cursor-pointer border-2 rounded-xl p-2 transition-all duration-200 hover:scale-105
                        ${value === rule.id
          ? "border-info bg-info/10 shadow-lg"
          : "border-base-300 bg-base-100 hover:border-info/60"}
                    `}
        >
          <input
            type="radio"
            name="rule"
            value={rule.id}
            checked={value === rule.id}
            onChange={() => onChange(rule.id)}
            className="hidden"
          />
          <div className="flex flex-col items-start">
            <span className="text-lg font-bold">{rule.name}</span>
            <span className="text-sm text-base-content/70 mt-1">{rule.desc}</span>
          </div>
        </label>
      ))}
    </div>
  );
}
