// RulesSection.tsx
import type { GameRule } from "../types";
import { useRulePageMutation } from "api/hooks/ruleQueryHooks";
import { useEffect, useState } from "react";

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
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // 状态
  const [rules, setRules] = useState<GameRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<GameRule[]>([]);

  // API Hooks
  const rulePageMutation = useRulePageMutation();

  // 规则分页获取
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const result = await rulePageMutation.mutateAsync({
          pageNo: pageNum,
          pageSize,
          keyword,
        });
        if (result && result.length > 0) {
          setRules(result);
          setFilteredRules(result);
          // 如果未选择规则，默认选第一个
          if (!currentRuleId) {
            onRuleChange(result[0].id);
          }
        }
      }
      catch (err) {
        console.error("规则加载失败:", err);
      }
    };
    fetchRules();
  }, [pageNum, pageSize, keyword]);

  // 处理搜索输入
  const handleSearchInput = (value: string) => {
    // 清除之前的定时器
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // 定时器延迟500ms执行搜索
    const timeout = setTimeout(() => {
      setKeyword(value);
      setPageNum(1); // 重置页码
    }, 500);

    setSearchTimeout(timeout);
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    if (!value.trim()) {
      setFilteredRules(rules);
      return;
    }

    const searchTerm = value.toLowerCase();
    const filtered = rules.filter(
      rule =>
        rule.name.toLowerCase().includes(searchTerm)
        || rule.description?.toLowerCase().includes(searchTerm),
    );
    setFilteredRules(filtered);
  };

  // 监听搜索关键词变化
  useEffect(() => {
    handleSearch(keyword);
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
                className="input input-bordered w-full pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-primary"
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
              }}
              className="select select-bordered w-full sm:w-auto"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
          </div>

          <div className="join bg-base-200 rounded-lg shadow-sm">
            <button
              onClick={() => setPageNum(p => Math.max(p - 1, 1))}
              disabled={pageNum === 1}
              className="join-item btn btn-ghost px-4 py-2 disabled:opacity-50"
            >
              «
            </button>
            <button className="join-item btn btn-ghost px-4 py-2 font-normal">
              第
              {" "}
              {pageNum}
              {" "}
              页
            </button>
            <button
              onClick={() => setPageNum(p => p + 1)}
              className="join-item btn btn-ghost px-4 py-2 disabled:opacity-50"
            >
              »
            </button>
          </div>
        </div>

        {/* 规则列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredRules.map(rule => (
            <div
              key={rule.id}
              className={`card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                currentRuleId === rule.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onRuleChange(rule.id)}
            >
              <div className="card-body p-4">
                <h3 className="card-title text-sm">{rule.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 没有搜索结果的提示 */}
        {filteredRules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            没有找到匹配的规则
          </div>
        )}
      </div>
    </div>
  );
}
