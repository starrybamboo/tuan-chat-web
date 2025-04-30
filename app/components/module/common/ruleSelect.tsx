import ScrollList from "@/components/common/list/scrollList";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useState } from "react";

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
  const [keyword, _setKeyword] = useState("");
  const [selectRuleId, setSelectRuleId] = useState<number | string | null>(null);

  const { data, isLoading, isSuccess } = useGetRulePageInfiniteQuery({
    pageNo,
    pageSize,
    keyword,
  });

  // 将 ruleItems 转换为 ScrollList 接受的形式
  let ruleItemData: ModifiedRuleItem[] = [];
  if (!isLoading && isSuccess) {
    const items: RuleItem[] = data.pages[0].data?.list || [];
    ruleItemData = items.map(i => ({
      id: i.ruleId,
      ruleName: i.ruleName,
      ruleDescription: i.ruleDescription,
    })) as ModifiedRuleItem[];
  }
  else {
    ruleItemData = [];
  }

  return (
    <div
      className={`rounded-xl bg-base-200 flex ${className || ""}`}
    >
      {
        isLoading
          ? undefined
          : (
              <ScrollList<ModifiedRuleItem>
                items={ruleItemData}
                RenderItem={RuleListItem}
                selectedId={selectRuleId}
                onSelect={(id) => {
                  setSelectRuleId(id);
                  onRuleSelect?.(id as number);
                }}
              />
            )
      }
    </div>
  );
}

export default RuleSelect;
