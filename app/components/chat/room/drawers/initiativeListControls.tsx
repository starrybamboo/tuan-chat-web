import type { Dispatch, SetStateAction } from "react";
import type {
  InitiativeDraft,
  InitiativeParam,
  InitiativeParamDraft,
  SortDirection,
  SortKey,
} from "./initiativeListTypes";

import { makeUniqueKey, slugifyLabel } from "./initiativeListKeyUtils";

interface InitiativeListControlsProps {
  initiativeCount: number;
  isPokemonRule: boolean;
  spaceOwner: boolean;
  importableRoleCount: number;
  isAdvancingRound: boolean;
  showParamEditor: boolean;
  params: InitiativeParam[];
  displayParams: InitiativeParam[];
  newItem: InitiativeDraft;
  newExtras: Record<string, string>;
  newParam: InitiativeParamDraft;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onNextRound: () => void;
  onOpenImportPopup: () => void;
  onToggleParamEditor: () => void;
  onAddParam: () => void;
  onRemoveParam: (key: string) => void;
  onAddItem: () => void;
  setNewItem: Dispatch<SetStateAction<InitiativeDraft>>;
  setNewExtras: Dispatch<SetStateAction<Record<string, string>>>;
  setNewParam: Dispatch<SetStateAction<InitiativeParamDraft>>;
  setSortKey: Dispatch<SetStateAction<SortKey>>;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
}

export function InitiativeListControls({
  initiativeCount,
  isPokemonRule,
  spaceOwner,
  importableRoleCount,
  isAdvancingRound,
  showParamEditor,
  params,
  displayParams,
  newItem,
  newExtras,
  newParam,
  sortKey,
  sortDirection,
  onNextRound,
  onOpenImportPopup,
  onToggleParamEditor,
  onAddParam,
  onRemoveParam,
  onAddItem,
  setNewItem,
  setNewExtras,
  setNewParam,
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
          {isPokemonRule && spaceOwner && (
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={onNextRound}
              disabled={isAdvancingRound}
            >
              {isAdvancingRound ? "结算中..." : "下一轮"}
            </button>
          )}
          {importableRoleCount > 0 && (
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={onOpenImportPopup}
            >
              导入先攻
            </button>
          )}
          {spaceOwner && (
            <button
              type="button"
              className={`btn btn-square btn-ghost btn-xs border border-base-300 ${showParamEditor ? "bg-base-200" : ""}`}
              title="添加自定义参数"
              onClick={onToggleParamEditor}
            >
              +
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {showParamEditor && spaceOwner && (
          <div className="rounded-md border border-base-200 bg-base-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-base-content">自定义参数</span>
              <span className="text-[11px] text-base-content/60">影响当前房间的列</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="显示名称 (必填)"
                value={newParam.label}
                onChange={(event) => {
                  const nextLabel = event.target.value;
                  const baseKey = slugifyLabel(nextLabel);
                  const nextKey = makeUniqueKey(baseKey, params);
                  setNewParam({ ...newParam, label: nextLabel, key: nextKey });
                }}
                className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md min-w-32"
              />
              <span className="text-xs text-base-content/60 px-2">
                键名：
                {newParam.key || "(自动生成)"}
              </span>
              <select
                className="select select-sm bg-base-50 border border-base-300 text-sm"
                value={newParam.source}
                onChange={event => setNewParam({ ...newParam, source: event.target.value as typeof newParam.source })}
              >
                <option value="manual">可编辑</option>
                <option value="roleAttr">来自角色属性</option>
              </select>
              {newParam.source === "roleAttr" && (
                <input
                  type="text"
                  placeholder="角色属性键 (必填)"
                  value={newParam.attrKey}
                  onChange={event => setNewParam({ ...newParam, attrKey: event.target.value })}
                  className="input input-sm bg-base-50 border border-base-300 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md min-w-28"
                />
              )}
              <button
                type="button"
                className="btn btn-sm bg-primary text-primary-content border-none hover:bg-primary/90"
                onClick={onAddParam}
                disabled={!newParam.label.trim() || (newParam.source === "roleAttr" && !newParam.attrKey.trim())}
              >
                添加
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {params.length === 0 && (
                <div className="text-xs text-base-content/60">暂无自定义参数。</div>
              )}
              {params.map(param => (
                <div key={param.key} className="flex items-center justify-between px-3 py-2 rounded-md bg-base-200">
                  <div className="flex flex-col text-sm">
                    <span className="font-medium text-base-content">{param.label || param.key}</span>
                    <span className="text-[11px] text-base-content/60">
                      键：
                      {param.key}
                    </span>
                    <span className="text-[11px] text-base-content/50">{param.source === "roleAttr" ? `来源: 角色属性 ${param.attrKey ?? ""}` : "来源: 固定/可编辑"}</span>
                  </div>
                  {spaceOwner && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onRemoveParam(param.key)}
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

            {displayParams.map(param => (
              <input
                key={param.key}
                type="text"
                placeholder={param.label}
                value={newExtras[param.key] ?? ""}
                onChange={event => setNewExtras({ ...newExtras, [param.key]: event.target.value })}
                className="input input-md bg-base-100 border border-base-400 text-base-content placeholder:text-base-content/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md flex-[1_1_80px]"
                disabled={param.source === "roleAttr"}
              />
            ))}
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
            {[{ key: "name" as SortKey, label: "名称" }, { key: "hp" as SortKey, label: "当前HP" }, { key: "maxHp" as SortKey, label: "最大HP" }, { key: "value" as SortKey, label: "先攻" }, ...params.map(p => ({ key: { paramKey: p.key } as SortKey, label: p.label }))].map((entry) => {
              const active = (typeof entry.key === "string" && entry.key === sortKey)
                || (typeof entry.key === "object" && typeof sortKey === "object" && entry.key.paramKey === sortKey.paramKey);
              const arrow = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
              return (
                <button
                  key={typeof entry.key === "string" ? entry.key : entry.key.paramKey}
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
