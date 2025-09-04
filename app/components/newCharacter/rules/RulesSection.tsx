// RulesSection.tsx

import type { Rule } from "api/models/Rule";
import { useRulePageQuery } from "api/hooks/ruleQueryHooks";
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
  // const [pageSize, setPageSize] = useState(4);
  const [keyword, setKeyword] = useState("");

  // 查询（分页 + 关键词）
  const pageSize = 4;
  const { data: rules = [] as Rule[] } = useRulePageQuery({
    pageNo: pageNum,
    pageSize,
    keyword,
  });

  // 当首次有数据且未选择规则时，默认选中第一个
  useEffect(() => {
    if (!currentRuleId && rules.length > 0) {
      onRuleChange(rules[0].ruleId || 0);
    }
  }, [rules, currentRuleId, onRuleChange]);

  // 处理搜索输入
  const handleSearchInput = (value: string) => {
    setKeyword(value);
    setPageNum(1); // 重置页码
  };

  return (
    <div className="space-y-3">
      {/* 搜索框和分页控制 */}
      {/* 只有一页且无搜索时隐藏整个搜索和分页组件 */}
      {(rules.length || keyword.trim()) && (
        <div className="flex justify-between items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索规则..."
              value={keyword}
              onChange={e => handleSearchInput(e.target.value)}
              className="input input-bordered input-sm w-full pl-8 pr-4"
            />
            <svg
              className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
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

          {/* 只有多页时才显示分页控制 */}

          <div className="join">
            <button
              type="button"
              onClick={() => {
                setPageNum(p => Math.max(p - 1, 1));
              }}
              disabled={pageNum === 1}
              className="join-item btn btn-ghost btn-sm disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="join-item btn btn-ghost btn-sm font-normal pointer-events-none text-xs">
              {pageNum}
            </div>

            <button
              type="button"
              onClick={() => setPageNum(p => p + 1)}
              disabled={rules.length < pageSize}
              className="join-item btn btn-ghost btn-sm disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
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
      )}

      {/* 规则列表 - 纵向排列 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {rules.map(rule => (
          <div
            key={rule.ruleId}
            className={`p-3 rounded-lg bg-base-100 hover:bg-base-200 transition-colors cursor-pointer border-2 ${currentRuleId === rule.ruleId
              ? "border-primary bg-primary/5"
              : "border-transparent"
            }`}
            onClick={() => onRuleChange(rule.ruleId || 0)}
          >
            <h3 className="font-medium text-sm mb-1">{rule.ruleName}</h3>
            <p className="text-xs text-base-content/60 line-clamp-2">
              {rule.ruleDescription}
            </p>
          </div>
        ))}
      </div>

      {/* 没有搜索结果的提示 */}
      {rules.length === 0 && (
        <div className="text-center py-6 text-base-content/60 text-sm">
          没有找到匹配的规则
        </div>
      )}
    </div>
  );
}
