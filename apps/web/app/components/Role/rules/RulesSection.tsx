// RulesSection.tsx

import { Plus } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import { useDebounce } from "ahooks";
import { Suspense, useCallback, useDeferredValue, useEffect, useState } from "react";

import { Button, buttonClassName } from "@/components/common/Button";
import { ControlGroup } from "@/components/common/ControlGroup";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { ImeAwareSearchInput } from "@/components/common/imeAwareSearchInput";
import { StateView } from "@/components/common/StateView";
import { Badge, LoadingIndicator } from "@/components/common/StatusPrimitives";
import { useRulePageSuspenseQuery } from "api/hooks/ruleQueryHooks";

type RulesListProps = {
  pageNum: number;
  pageSize: number;
  keyword: string;
  authorId?: number;
  large?: boolean;
  dense?: boolean;
  gridMode?: "two" | "four";
  showRuleId?: boolean;
  currentRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  autoSelectFirst: boolean;
  onLoadedOnce: () => void;
  onMetaChange: (isLast: boolean, rulesCount: number) => void;
}

type RulesSectionProps = {
  currentRuleId: number;
  onRuleChange: (newRuleId: number) => void;
  large?: boolean; // 巨大模式：使用卡片宫格外观（类似 RuleSelectionStep）
  autoSelectFirst?: boolean; // 默认 true：首次加载时自动选中第一个规则
  authorId?: number; // 可选：按作者ID过滤规则列表（用于“我的规则”等场景）
  pageSize?: number;
  dense?: boolean;
  gridMode?: "two" | "four";
  showRuleId?: boolean;
  title?: string;
  description?: string;
  controlsInHeader?: boolean;
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
  autoSelectFirst = true,
  authorId = undefined,
  pageSize = 8,
  dense = false,
  gridMode = "two",
  showRuleId = true,
  title,
  description,
  controlsInHeader = false,
}: RulesSectionProps) {
  const router = useRouter();
  // 内部状态管理 - 完全自治
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState("");

  // 首次加载完成后，才展示搜索/分页
  const [didLoadOnce, setDidLoadOnce] = useState(false);
  const [isLastPage, setIsLastPage] = useState<boolean>(false);
  const [rulesCount, setRulesCount] = useState<number>(0);

  // 防抖，并在新结果准备就绪之前显示先前的搜索结果
  const debouncedKeyword = useDebounce(keyword, { wait: 300 });
  const deferredKeyword = useDeferredValue(debouncedKeyword);
  const isSearching = keyword !== deferredKeyword;

  const handleLoadedOnce = useCallback(() => {
    setDidLoadOnce(true);
  }, []);

  const handleMetaChange = useCallback((nextIsLast: boolean, nextRulesCount: number) => {
    setIsLastPage(nextIsLast);
    setRulesCount(nextRulesCount);
  }, []);

  // 处理搜索输入
  const handleSearchInput = (value: string) => {
    setKeyword(value);
    setPageNum(1); // 重置页码
  };

  // 提取搜索与分页控件（两种模式共用）
  const searchControls = (
    (didLoadOnce) && (
      <div className="
        flex items-center gap-2 w-full
        md:w-auto
      ">
        <div className="
          relative flex-1
          md:flex-none
        ">
          <ImeAwareSearchInput
            density={large ? "default" : "compact"}
            type="text"
            autoComplete="off"
            aria-label="搜索规则"
            placeholder="搜索规则..."
            value={keyword}
            onValueChange={handleSearchInput}
            className="w-full pl-8 pr-4 md:w-64"
          />
          {isSearching
            ? (
                <LoadingIndicator
                  size="compact"
                  label="正在搜索规则"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base-content/50"
                />
              )
            : (
                <svg
                  className="
                    absolute left-2.5 top-1/2 transform -translate-y-1/2 size-4
                    text-base-content/50
                  "
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
              )}
        </div>
        <ControlGroup className="shrink-0" aria-label="规则分页">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPageNum(Math.max(pageNum - 1, 1))}
            disabled={pageNum === 1}
            aria-label="上一页"
            title={pageNum === 1 ? "已经是第一页" : "上一页"}
            className="disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Button>
          <div className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "font-normal pointer-events-none text-xs",
          })}>{pageNum}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPageNum(pageNum + 1)}
            disabled={isLastPage ?? (rulesCount < pageSize)}
            aria-label="下一页"
            title={(isLastPage ?? rulesCount < pageSize) ? "已经是最后一页" : "下一页"}
            className="disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Button>
        </ControlGroup>
      </div>
    )
  );

  const searchBar = (
    (didLoadOnce) && (
      <div className="flex justify-between items-center gap-3">
        {searchControls}
      </div>
    )
  );

  if (large) {
    return (
      <div className="space-y-6">
        <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 p-6 shadow-xs" })}>
          <div>
            <div className="flex justify-between">
              <h3 className="flex items-center gap-2 text-component-title font-medium">⚙️ 选择规则系统</h3>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.history.push("/role?type=rule&mode=entry")}
              >
                <Plus className="size-4" weight="regular" />
                自定义规则
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {searchBar}
              <Suspense
                fallback={(
                  <StateView loading title="正在加载规则列表…" className="py-2" />
                )}
              >
                <RulesList
                  large
                  authorId={authorId}
                  autoSelectFirst={autoSelectFirst}
                  currentRuleId={currentRuleId}
                  dense={dense}
                  gridMode={gridMode}
                  showRuleId={showRuleId}
                  keyword={deferredKeyword}
                  onLoadedOnce={handleLoadedOnce}
                  onMetaChange={handleMetaChange}
                  onRuleChange={onRuleChange}
                  pageNum={pageNum}
                  pageSize={pageSize}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 默认紧凑模式
  return (
    <div className="space-y-3">
      {controlsInHeader && title && (
        <div className="
          flex flex-col
          md:flex-row md:items-start md:justify-between
          gap-3
        ">
          <div>
            <div className="
              font-semibold text-base
              md:text-lg
            ">{title}</div>
            {description && (
              <div className="text-sm text-base-content/60">{description}</div>
            )}
          </div>
          <div className="
            w-full
            md:w-auto md:ml-auto
          ">
            {searchControls}
          </div>
        </div>
      )}
      {!controlsInHeader && searchBar}
      <Suspense
        fallback={(
          <StateView loading title="正在加载规则列表…" className="py-2" />
        )}
      >
        <RulesList
          authorId={authorId}
          autoSelectFirst={autoSelectFirst}
          currentRuleId={currentRuleId}
          dense={dense}
          gridMode={gridMode}
          showRuleId={showRuleId}
          keyword={deferredKeyword}
          onLoadedOnce={handleLoadedOnce}
          onMetaChange={handleMetaChange}
          onRuleChange={onRuleChange}
          pageNum={pageNum}
          pageSize={pageSize}
        />
      </Suspense>
    </div>
  );
}

function RulesList({
  pageNum,
  pageSize,
  keyword,
  authorId,
  large = false,
  dense = false,
  gridMode = "two",
  showRuleId = true,
  currentRuleId,
  onRuleChange,
  autoSelectFirst,
  onLoadedOnce,
  onMetaChange,
}: RulesListProps) {
  const { data: rules, meta } = useRulePageSuspenseQuery(pageNum, keyword, pageSize, authorId);

  // 通知父组件：已成功加载过一次
  useEffect(() => {
    onLoadedOnce();
  }, [onLoadedOnce]);

  // 同步分页信息给父组件（用于禁用下一页按钮/展示控制）
  useEffect(() => {
    const isLast = meta?.isLast ?? (rules.length < pageSize);
    onMetaChange(isLast, rules.length);
  }, [meta?.isLast, onMetaChange, pageSize, rules.length]);

  // 当首次有数据且未选择规则时，默认选中第一个
  useEffect(() => {
    if (autoSelectFirst && !currentRuleId && rules.length > 0) {
      onRuleChange(rules[0].ruleId || 0);
    }
  }, [rules, currentRuleId, onRuleChange, autoSelectFirst]);

  if (large) {
    return (
      <>
        <div className="
          grid gap-4 grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
        ">
          {rules.map(rule => (
            <div
              key={rule.ruleId}
              className={surfaceClassName({ level: "content", className: `
                cursor-pointer transition-all shadow-xs
                ${currentRuleId === rule.ruleId
                ? "border-info"
                : `
                  border-base-300
                  hover:border-base-400 hover:bg-base-200/60
                `
              }
              ` })}
              role="button"
              tabIndex={0}
              aria-label={`选择规则：${rule.ruleName}`}
              onClick={() => onRuleChange(rule.ruleId || 0)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRuleChange(rule.ruleId || 0);
                }
              }}
            >
              <div className="
                p-5
                md:p-6
                min-h-32
              ">
                <div className="
                  flex h-full items-center justify-between gap-4
                  md:gap-6
                ">
                  <div>
                    {showRuleId && (
                      <p className="text-sm text-base-content/70 line-clamp-2">{`#${rule.ruleId}`}</p>
                    )}
                    <h4 className="font-medium text-base">{rule.ruleName}</h4>
                    <p className="text-sm text-base-content/70 line-clamp-2">{rule.ruleDescription}</p>
                  </div>
                  {currentRuleId === rule.ruleId && (
                    <Badge appearance="ghost" density="default">已选择</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {rules.length === 0 && (
          <div className="text-center py-6 text-base-content/60 text-sm">没有找到匹配的规则</div>
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={gridMode === "four"
          ? `
            grid grid-cols-2
            md:grid-cols-4
            gap-2
          `
          : "grid grid-cols-2 gap-2 max-h-96 overflow-y-auto"}
      >
        {rules.map(rule => (
          <button
            key={rule.ruleId}
            type="button"
            className={dense
              ? `
                w-full text-left
                p-2
                md:p-2.5
                rounded-md bg-base-100
                hover:bg-base-200
                transition-colors cursor-pointer border
                ${currentRuleId === rule.ruleId
                ? "border-info"
                : "border-base-content/10"
              }
              `
              : `
                w-full text-left
                p-3 rounded-lg bg-base-100
                hover:bg-base-200
                transition-colors cursor-pointer border-2
                ${currentRuleId === rule.ruleId
                ? "border-info"
                : "border-transparent"
              }
              `}
            onClick={() => onRuleChange(rule.ruleId || 0)}
            aria-pressed={currentRuleId === rule.ruleId}
          >
            {showRuleId && (
              <p className={`
                text-base-content/60 line-clamp-1
                ${dense ? `text-[11px]` : `text-xs`}
              `}>{`#${rule.ruleId}`}</p>
            )}
            <h3 className={`
              font-medium mb-1 line-clamp-1
              ${dense ? "text-xs" : `text-sm`}
            `}>{rule.ruleName}</h3>
            <p className={`
              text-base-content/60 line-clamp-2
              ${dense ? `text-[11px]` : `text-xs`}
            `}>{rule.ruleDescription}</p>
          </button>
        ))}
        {/* 添加占位项以保持项目宫格的固定高度 */}
        {Array.from({ length: Math.max(0, pageSize - rules.length) }, (_, index) => `compact-placeholder-${rules.length}-${index}`).map(placeholderId => (
          <div
            key={placeholderId}
            className={dense
              ? `
                p-2
                md:p-2.5
                rounded-md bg-transparent border border-dashed
                border-base-content/10 opacity-30
              `
              : `
                p-3 rounded-lg bg-transparent border-2 border-dashed
                border-base-content/10 opacity-30
              `}
          >
            <div className="
              flex items-center justify-center text-base-content/50
            ">
              <div className="text-center">
                <h3 className={`
                  font-medium mb-1
                  ${dense ? "text-xs" : "text-sm"}
                `}>...</h3>
                <div className={dense ? "text-[11px]" : "text-xs"}>暂无更多</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {rules.length === 0 && (
        <div className="text-center py-6 text-base-content/60 text-sm">没有找到匹配的规则</div>
      )}
    </>
  );
}
