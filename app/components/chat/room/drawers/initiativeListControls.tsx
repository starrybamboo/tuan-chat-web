import type { Dispatch, SetStateAction } from "react";
import type {
  InitiativeDraft,
  SortDirection,
  SortKey,
} from "./initiativeListTypes";

interface InitiativeListControlsProps {
  initiativeCount: number;
  spaceOwner: boolean;
  importableRoleCount: number;
  newItem: InitiativeDraft;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onOpenImportPopup: () => void;
  onAddItem: () => void;
  setNewItem: Dispatch<SetStateAction<InitiativeDraft>>;
  setSortKey: Dispatch<SetStateAction<SortKey>>;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
}

type BuiltInSortKey = Extract<SortKey, string>;

const BUILT_IN_SORT_OPTIONS: Array<{ key: BuiltInSortKey; label: string }> = [
  { key: "name", label: "名称" },
  { key: "hp", label: "当前HP" },
  { key: "maxHp", label: "最大HP" },
  { key: "value", label: "先攻" },
];

export function InitiativeListControls({
  initiativeCount,
  spaceOwner,
  importableRoleCount,
  newItem,
  sortKey,
  sortDirection,
  onOpenImportPopup,
  onAddItem,
  setNewItem,
  setSortKey,
  setSortDirection,
}: InitiativeListControlsProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-base-content truncate">先攻列表</span>
          <span className="text-xs text-base-content/60 truncate">
            共
            {" "}
            {initiativeCount}
            {" "}
            项
          </span>
        </div>

        <div className="flex items-center gap-2">
          {importableRoleCount > 0 && (
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={onOpenImportPopup}
            >
              导入先攻
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex flex-col gap-1">
          <div className="relative flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="角色名"
              value={newItem.name}
              onChange={event => setNewItem({ ...newItem, name: event.target.value })}
              className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
            />
            <input
              type="text"
              placeholder="先攻"
              value={newItem.value}
              onChange={event => setNewItem({ ...newItem, value: event.target.value })}
              className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
            />
            <input
              type="text"
              placeholder="当前HP"
              value={newItem.hp}
              onChange={event => setNewItem({ ...newItem, hp: event.target.value })}
              className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
            />
            <input
              type="text"
              placeholder="最大HP"
              value={newItem.maxHp}
              onChange={event => setNewItem({ ...newItem, maxHp: event.target.value })}
              className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px] "
            />
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="btn btn-md rounded px-5 bg-primary text-primary-content border-none hover:bg-primary/90 shadow-sm w-full disabled:bg-base-300 disabled:text-base-content/40"
            disabled={
              !newItem.name
              || (newItem.hp.trim() !== "" && Number.isNaN(Number(newItem.hp)))
              || (newItem.maxHp.trim() !== "" && Number.isNaN(Number(newItem.maxHp)))
            }
          >
            添加
          </button>
        </div>

        {spaceOwner && (
          <div className="flex flex-wrap items-center gap-2 p-2">
            {BUILT_IN_SORT_OPTIONS.map((entry) => {
              const active = entry.key === sortKey;
              const arrow = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
              return (
                <button
                  key={entry.key}
                  type="button"
                  className={`btn btn-ghost btn-xs border border-base-300 ${active ? "bg-base-200" : ""}`}
                  onClick={() => {
                    if (active) {
                      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
                    }
                    else {
                      setSortKey(entry.key);
                      setSortDirection("asc");
                    }
                  }}
                >
                  {entry.label}
                  <span className="ml-1 text-[11px]">{arrow}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="h-px bg-base-200" />

        <div className="text-[11px] text-base-content/50 px-1">
          提示：双击名称或数值可以进行编辑。
        </div>
      </div>
    </>
  );
}
