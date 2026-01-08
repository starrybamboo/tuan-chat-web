import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useState } from "react";
import ScrollList from "@/components/common/list/scrollList";

// 定义渲染组件
const RuleListItem: React.FC<{ item: ModifiedRuleItem }> = ({ item }) => (
  <div className="w-full flex-grow flex flex-col gap-2 rounded-md">
    <span className="text-lg">{item.ruleName}</span>
    <span>{item.ruleDescription}</span>
  </div>
);

// 定义列表项类型
interface RuleItem {
  ruleId?: number;
  ruleName?: string;
  ruleDescription?: string;
}

interface ModifiedRuleItem {
  id: number;
  ruleName: string;
  ruleDescription: string;
}

// 允许通过可选的 ruleId 指定初始选中项；UI 与功能保持不变，仅增强可用性和滚动区域结构
function RuleSelect({ className, onRuleSelect, ruleId, editable = true }: { className?: string; onRuleSelect?: (id: number) => void; ruleId?: number; editable?: boolean }) {
  const [pageSize, _setPageSize] = useState(20);
  const [pageNo, _setPageNo] = useState(1);
  const [_pageCount, _setPageCount] = useState(0);
  const [_total, _setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectRuleId, setSelectRuleId] = useState<number | string | null>(null);

  // 外部传入的默认选中规则
  if (ruleId != null && selectRuleId == null) {
    setSelectRuleId(ruleId);
  }

  const { data, isLoading, isSuccess } = useGetRulePageInfiniteQuery({
    pageNo,
    pageSize,
    keyword: searchKeyword,
  });

  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setKeyword(e.target.value);
    if (e.target.value === "") {
      setSearchKeyword("");
    }
  }

  // 直接处理数据转换而不缓存
  const processedRuleData: ModifiedRuleItem[] = (() => {
    if (!isLoading && isSuccess && data) {
      const items: RuleItem[] = data.pages[0].data?.list || [];
      return items
        .filter(i => i.ruleId != null && i.ruleName != null && i.ruleDescription != null)
        .map(i => ({
          id: i.ruleId!,
          ruleName: i.ruleName!,
          ruleDescription: i.ruleDescription!,
        }));
    }
    return [];
  })();

  return (
    <div
      className={`rounded-xl bg-base-200 shadow flex flex-col overflow-hidden ${className || ""}`}
    >
      <div className="flex h-[40px] mb-4 px-3 pt-3">
        <h2 className="text-lg font-bold h-full flex items-center">选择规则</h2>
        <label className="input basis-2/3 ml-auto">
          <input
            type="search"
            className="grow"
            placeholder="Search"
            value={keyword}
            onChange={handleKeywordChange}
            disabled={!editable}
            aria-disabled={!editable}
            onKeyDown={(e) => {
              if (!editable) {
                return;
              }
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchKeyword(keyword);
              }
            }}
          />
          <kbd className="kbd kbd-sm">⏎</kbd>
        </label>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-3 pb-3">
        <ScrollList<ModifiedRuleItem>
          items={processedRuleData}
          RenderItem={RuleListItem}
          selectedId={selectRuleId}
          onSelect={(id) => {
            if (!editable) {
              return;
            }
            setSelectRuleId(id);
            onRuleSelect?.(id as number);
          }}
        />
      </div>
    </div>
  );
}

export default RuleSelect;
