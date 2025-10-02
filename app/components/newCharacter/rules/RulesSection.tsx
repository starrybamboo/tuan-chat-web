// RulesSection.tsx

import type { Rule } from "api/models/Rule";
import { useRulePageQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useState } from "react";

interface RulesSectionProps {
  currentRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  large?: boolean; // 巨大模式：使用卡片宫格外观（类似 RuleSelectionStep）
  // 外部状态管理（用于预取数据）
  pageNum?: number;
  onPageChange?: (pageNum: number) => void;
  keyword?: string;
  onKeywordChange?: (keyword: string) => void;
}

/**
 * 规则选择组件
 * 用于选择角色使用的游戏规则系统，如COC、DND等
 * 每种规则系统决定了角色的表演字段和数值约束
 */
export default function RulesSection({
  currentRuleId,
  onRuleChange,
  large = false,
  // 外部状态管理
  pageNum: externalPageNum,
  onPageChange: externalOnPageChange,
  keyword: externalKeyword,
  onKeywordChange: externalOnKeywordChange,
}: RulesSectionProps) {
  // 分页和搜索状态 - 优先使用外部状态，否则使用内部状态
  const [internalPageNum, setInternalPageNum] = useState(1);
  const [internalKeyword, setInternalKeyword] = useState("");

  const pageNum = externalPageNum ?? internalPageNum;
  const setPageNum = externalOnPageChange ?? setInternalPageNum;
  const keyword = externalKeyword ?? internalKeyword;
  const setKeyword = externalOnKeywordChange ?? setInternalKeyword;

  // 每页大小（分页展示固定 4）
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

  // 提取搜索与分页控件（两种模式共用）
  const searchBar = (
    (rules.length || keyword.trim()) && (
      <div className="flex justify-between items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜索规则..."
            value={keyword}
            onChange={e => handleSearchInput(e.target.value)}
            className={`input input-bordered input-sm w-full pl-8 pr-4 ${large ? "md:input-md" : ""}`}
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
        <div className="join">
          <button
            type="button"
            onClick={() => setPageNum(Math.max(pageNum - 1, 1))}
            disabled={pageNum === 1}
            className="join-item btn btn-ghost btn-sm disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="join-item btn btn-ghost btn-sm font-normal pointer-events-none text-xs">{pageNum}</div>
          <button
            type="button"
            onClick={() => setPageNum(pageNum + 1)}
            disabled={rules.length < pageSize}
            className="join-item btn btn-ghost btn-sm disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    )
  );

  if (large) {
    return (
      <div className="space-y-6">
        <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">⚙️ 选择规则系统</h3>
            <div className="mt-4 space-y-4">
              {searchBar}
              <div className="grid gap-4 grid-cols-1">
                {rules.map(rule => (
                  <div
                    key={rule.ruleId}
                    className={`card cursor-pointer transition-all bg-base-100 shadow-xs rounded-2xl border border-base-content/10 ${currentRuleId === rule.ruleId
                      ? "border-primary ring-2 ring-primary bg-primary/5"
                      : "border-base-300 hover:border-base-400 hover:bg-base-200/60"
                    }`}
                    onClick={() => onRuleChange(rule.ruleId || 0)}
                  >
                    <div className="card-body p-5 md:p-6 min-h-[128px]">
                      <div className="flex h-full items-center justify-between gap-4 md:gap-6">
                        <div>
                          <h4 className="font-medium text-base">{rule.ruleName}</h4>
                          <p className="text-sm text-base-content/70 line-clamp-2">{rule.ruleDescription}</p>
                        </div>
                        {currentRuleId === rule.ruleId && (
                          <div className="badge badge-primary badge-sm md:badge-md">已选择</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rules.length === 0 && (
                <div className="text-center py-6 text-base-content/60 text-sm">没有找到匹配的规则</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 默认紧凑模式
  return (
    <div className="space-y-3">
      {searchBar}
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
            <p className="text-xs text-base-content/60 line-clamp-2">{rule.ruleDescription}</p>
          </div>
        ))}
        {/* 添加占位项以保持4个项目的固定高度 */}
        {Array.from({ length: Math.max(0, 4 - rules.length) }, (_, index) => `compact-placeholder-${rules.length}-${index}`).map(placeholderId => (
          <div
            key={placeholderId}
            className="p-3 rounded-lg bg-transparent border-2 border-dashed border-base-content/10 opacity-30"
          >
            <div className="flex items-center justify-center text-base-content/40">
              <div className="text-center">
                <h3 className="font-medium text-sm mb-1">...</h3>
                <div className="text-xs">暂无更多</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rules.length === 0 && (
        <div className="text-center py-6 text-base-content/60 text-sm">没有找到匹配的规则</div>
      )}
    </div>
  );
}
