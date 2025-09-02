// RulesSection.tsx

import type { Rule } from "api/models/Rule";
import { useRulePageMutation } from "api/hooks/ruleQueryHooks";
import { useEffect, useMemo, useState } from "react";

interface RulesSectionProps {
  currentRuleId: number;
  onRuleChange: (newRuleId: number) => void;
}

/**
 * 规则选择组件
 * 用于选择角色使用的游戏规则系统，如COC、DND等
 * 每种规则系统决定了角色的表演字段和数值约束
 */
export default function RulesSection({
  currentRuleId,
  onRuleChange,
}: RulesSectionProps) {
  // 分页和搜索状态
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [keyword, setKeyword] = useState("");

  // 状态
  const [rules, setRules] = useState<Rule[]>([]);
  // const [filteredRules, setFilteredRules] = useState<Rule[]>([]); // 删除这行

  // API Hooks
  const rulePageMutation = useRulePageMutation();

  // 初始化规则分页获取
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await rulePageMutation.mutateAsync({ pageNo: 1, pageSize: 10 });
        if (result && result.length > 0) {
          setRules(result);
          // 如果未选择规则，默认选第一个
          if (!currentRuleId) {
            onRuleChange(result[0].ruleId || 0);
          }
        }
      }
      catch (err) {
        console.error("规则加载失败:", err);
      }
    };

    fetchRules();
  }, []);

  // 处理搜索输入
  const handleSearchInput = (value: string) => {
    setKeyword(value);
    setPageNum(1); // 重置页码
  };

  // 监听搜索关键词变化
  // 使用 useMemo 处理搜索过滤
  const filteredRulesList = useMemo(() => {
    if (!keyword.trim()) {
      return rules;
    }

    const searchTerm = keyword.toLowerCase();
    return rules.filter(
      rule =>
        rule.ruleName?.toLowerCase().includes(searchTerm)
        || rule.ruleDescription?.toLowerCase().includes(searchTerm),
    );
  }, [keyword, rules]);

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="flex flex-col gap-4">
        {/* 搜索和分页控制 */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="搜索规则..."
                defaultValue={keyword}
                onChange={e => handleSearchInput(e.target.value)}
                className="input input-bordered w-full pl-10 pr-4 py-2 rounded-lg focus:ring-primary"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageNum(1);
                rulePageMutation.mutate({
                  pageNo: pageNum,
                  pageSize,
                  keyword,
                });
              }}
              className="select select-bordered w-full sm:w-auto hidden sm:block"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
          </div>

          <div className="join bg-base-200 rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => {
                setPageNum(p => Math.max(p - 1, 1));
                rulePageMutation.mutate({
                  pageNo: pageNum - 1,
                  pageSize,
                  keyword,
                });
              }}
              disabled={pageNum === 1}
              className="join-item btn btn-ghost px-4 py-2 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="join-item btn btn-ghost px-4 py-2 font-normal w-24 text-center pointer-events-none">
              第
              {" "}
              {pageNum}
              {" "}
              页
            </div>

            <button
              type="button"
              onClick={() => {
                setPageNum(p => p + 1);
                rulePageMutation.mutate({
                  pageNo: pageNum + 1,
                  pageSize,
                  keyword,
                });
              }}
              disabled={
                // 如果返回的数据少于 pageSize，说明没有下一页
                (rulePageMutation.data?.length || 0) < pageSize
              }
              className="join-item btn btn-ghost px-4 py-2 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* 规则列表 */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredRulesList.map(rule => (
            <div
              key={rule.ruleId}
              className={`card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                currentRuleId === rule.ruleId ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onRuleChange(rule.ruleId || 0)}
            >
              <div className="card-body p-4">
                <h3 className="card-title text-sm">{rule.ruleName}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {rule.ruleDescription}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 没有搜索结果的提示 */}
        {filteredRulesList.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有找到匹配的规则
          </div>
        )}
      </div>
    </div>
  );
}
