import ScrollList from "@/components/common/list/scrollList";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useEffect, useState } from "react";

// 定义渲染组件
const RuleListItem: React.FC<{ item: ModifiedRuleItem }> = ({ item }) => (
  <div className="w-full flex-grow flex flex-col gap-2 rounded-md">
    <span className="text-lg">{item.ruleName}</span>
    <span>{item.ruleDescription}</span>
  </div>
);

// 定义列表项类型
interface RuleItem {
  ruleId: number;
  ruleName: string;
  ruleDescription: string;
}

interface ModifiedRuleItem {
  id: number;
  ruleName: string;
  ruleDescription: string;
}

function RuleSelect({ className, onRuleSelect }: { className?: string; onRuleSelect?: (id: number) => void }) {
  const [pageSize, _setPageSize] = useState(20);
  const [pageNo, _setPageNo] = useState(1);
  const [_pageCount, _setPageCount] = useState(0);
  const [_total, _setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectRuleId, setSelectRuleId] = useState<number | string | null>(null);
  const [cachedRuleData, setCachedRuleData] = useState<ModifiedRuleItem[]>([]);

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

  // 监听数据变化并更新缓存
  useEffect(() => {
    if (!isLoading && isSuccess && data) {
      const items: RuleItem[] = data.pages[0].data?.list || [];
      const newRuleData = items.map(i => ({
        id: i.ruleId,
        ruleName: i.ruleName,
        ruleDescription: i.ruleDescription,
      })) as ModifiedRuleItem[];
      setCachedRuleData(newRuleData);
    }
  }, [data, isLoading, isSuccess]);

  return (
    <div
      className={`rounded-xl bg-base-200 flex flex-col ${className || ""}`}
    >
      <div className="flex h-[40px] mb-4">
        <h2 className="text-lg font-bold h-full flex items-center">选择规则</h2>
        <label className="input basis-2/3 ml-auto">
          <input
            type="search"
            className="grow"
            placeholder="Search"
            value={keyword}
            onChange={handleKeywordChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setSearchKeyword(keyword);
              }
            }}
          />
          <kbd className="kbd kbd-sm">⏎</kbd>
        </label>
      </div>
      <ScrollList<ModifiedRuleItem>
        items={cachedRuleData}
        RenderItem={RuleListItem}
        selectedId={selectRuleId}
        onSelect={(id) => {
          setSelectRuleId(id);
          onRuleSelect?.(id as number);
        }}
      />
    </div>
  );
}

export default RuleSelect;
