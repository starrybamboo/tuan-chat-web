import type { PokemonDefensiveMatchups } from "./initiativeListDerived";

import type { Initiative, InitiativeParam } from "./initiativeListTypes";
import { Fragment } from "react";

import { parseNullableNumber, parseNumberOrZero } from "./initiativeListAbilityExtractors";

interface InitiativeListTableProps {
  initiativeList: Initiative[];
  sortedList: Initiative[];
  displayParams: InitiativeParam[];
  levelParam?: InitiativeParam;
  isPokemonRule: boolean;
  editingKey: string | null;
  editingValue: string;
  pokemonDefensiveByRoleId: Map<number, PokemonDefensiveMatchups>;
  pokemonTraitByRoleId: Map<number, string>;
  pokemonStatusByRoleId: Map<number, string>;
  pokemonItemByRoleId: Map<number, string>;
  pokemonActionPointByRoleId: Map<number, string>;
  getEditingRef: (key: string) => (node: HTMLInputElement | null) => void;
  setEditingValue: (value: string) => void;
  startEditing: (key: string, value: string) => void;
  stopEditing: () => void;
  commitEditing: (key: string, apply: (value: string) => void) => void;
  updateItem: (item: Initiative, patch: Partial<Initiative>) => void;
  updateItemExtras: (item: Initiative, key: string, value: string) => void;
  handleDelete: (item: Initiative) => void;
}

export function InitiativeListTable({
  initiativeList,
  sortedList,
  displayParams,
  levelParam,
  isPokemonRule,
  editingKey,
  editingValue,
  pokemonDefensiveByRoleId,
  pokemonTraitByRoleId,
  pokemonStatusByRoleId,
  pokemonItemByRoleId,
  pokemonActionPointByRoleId,
  getEditingRef,
  setEditingValue,
  startEditing,
  stopEditing,
  commitEditing,
  updateItem,
  updateItemExtras,
  handleDelete,
}: InitiativeListTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            {isPokemonRule && <th className="text-xs font-semibold text-base-content/70">等级</th>}
            <th className="text-xs font-semibold text-base-content/70">角色名</th>
            <th className="text-xs font-semibold text-base-content/70">HP</th>
            {isPokemonRule && <th className="text-xs font-semibold text-base-content/70">行动点</th>}
            <th className="text-xs font-semibold text-base-content/70">先攻</th>
          </tr>
        </thead>
        <tbody>
          {initiativeList.length === 0
            ? (
                <tr>
                  <td colSpan={isPokemonRule ? 5 : 3} className="text-xs text-base-content/50 text-center py-4">
                    暂无先攻记录，添加一个吧。
                  </td>
                </tr>
              )
            : (
                sortedList.map((item, index) => {
                  const hp = item.hp ?? null;
                  const maxHp = item.maxHp ?? null;
                  const levelValue = levelParam ? item.extras?.[levelParam.key] : null;
                  const defensiveMatchup = typeof item.roleId === "number"
                    ? pokemonDefensiveByRoleId.get(item.roleId)
                    : undefined;
                  const traitText = typeof item.roleId === "number"
                    ? (pokemonTraitByRoleId.get(item.roleId) ?? "--")
                    : "--";
                  const itemText = typeof item.roleId === "number"
                    ? pokemonItemByRoleId.get(item.roleId)
                    : undefined;
                  const statusText = typeof item.roleId === "number"
                    ? pokemonStatusByRoleId.get(item.roleId)
                    : undefined;
                  const actionPointText = typeof item.roleId === "number"
                    ? (pokemonActionPointByRoleId.get(item.roleId) ?? "--")
                    : "--";
                  const multiplierText = (() => {
                    if (!defensiveMatchup)
                      return "--";
                    const order: Array<"4" | "2" | "0.5" | "0.25" | "0"> = ["4", "2", "0.5", "0.25", "0"];
                    const spacing = "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0";
                    const segments = order
                      .filter(multiplier => defensiveMatchup[multiplier].length > 0)
                      .map(multiplier => `${multiplier}：${defensiveMatchup[multiplier].join("/")}`);
                    return segments.length > 0 ? segments.join(spacing) : "--";
                  })();
                  const rowKey = item.name || `${index}`;
                  const nameEditKey = `${rowKey}:name`;
                  const hpEditKey = `${rowKey}:hp`;
                  const maxHpEditKey = `${rowKey}:maxHp`;
                  const valueEditKey = `${rowKey}:value`;

                  return (
                    <Fragment key={rowKey}>
                      <tr className="group hover">
                        {isPokemonRule && (
                          <td className="align-top">
                            <div className="text-sm tabular-nums min-h-6 leading-6 px-1">{levelValue != null && levelValue !== "" ? String(levelValue) : "--"}</div>
                          </td>
                        )}
                        <td className="align-top">
                          {editingKey === nameEditKey
                            ? (
                                <input
                                  ref={getEditingRef(nameEditKey)}
                                  type="text"
                                  value={editingValue}
                                  onChange={event => setEditingValue(event.target.value)}
                                  onBlur={() => {
                                    commitEditing(nameEditKey, val => updateItem(item, { name: val }));
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      commitEditing(nameEditKey, val => updateItem(item, { name: val }));
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      stopEditing();
                                    }
                                  }}
                                  className="input input-xs bg-base-100 border border-base-300 text-sm font-medium text-base-content w-full min-h-6 leading-6 min-w-0"
                                />
                              )
                            : (
                                <button
                                  type="button"
                                  className="text-left text-sm font-medium text-base-content w-full min-h-6 leading-6 truncate px-1 min-w-0"
                                  onDoubleClick={() => startEditing(nameEditKey, item.name)}
                                  title="双击编辑"
                                >
                                  {item.name}
                                </button>
                              )}
                        </td>
                        <td className="align-top">
                          <div className="flex items-center gap-0.5 text-xs text-base-content/70 leading-5">
                            {editingKey === hpEditKey
                              ? (
                                  <input
                                    ref={getEditingRef(hpEditKey)}
                                    type="number"
                                    value={editingValue}
                                    onChange={event => setEditingValue(event.target.value)}
                                    onBlur={() => {
                                      commitEditing(hpEditKey, val => updateItem(item, { hp: parseNullableNumber(val) }));
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitEditing(hpEditKey, val => updateItem(item, { hp: parseNullableNumber(val) }));
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        stopEditing();
                                      }
                                    }}
                                    className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                  />
                                )
                              : (
                                  <button
                                    type="button"
                                    className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                    onDoubleClick={() => startEditing(hpEditKey, hp != null ? String(hp) : "")}
                                    title="双击编辑"
                                  >
                                    {hp != null ? String(hp) : "--"}
                                  </button>
                                )}
                            <span className="px-1">/</span>
                            {editingKey === maxHpEditKey
                              ? (
                                  <input
                                    ref={getEditingRef(maxHpEditKey)}
                                    type="number"
                                    value={editingValue}
                                    onChange={event => setEditingValue(event.target.value)}
                                    onBlur={() => {
                                      commitEditing(maxHpEditKey, val => updateItem(item, { maxHp: parseNullableNumber(val) }));
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitEditing(maxHpEditKey, val => updateItem(item, { maxHp: parseNullableNumber(val) }));
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        stopEditing();
                                      }
                                    }}
                                    className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                  />
                                )
                              : (
                                  <button
                                    type="button"
                                    className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                    onDoubleClick={() => startEditing(maxHpEditKey, maxHp != null ? String(maxHp) : "")}
                                    title="双击编辑"
                                  >
                                    {maxHp != null ? String(maxHp) : "--"}
                                  </button>
                                )}
                          </div>

                          {displayParams.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-0.5 text-xs text-base-content/70 leading-5">
                              {displayParams.map(param => (
                                <div key={param.key} className="flex items-center gap-0.5">
                                  <span className="whitespace-nowrap" title={param.label}>{param.label}</span>
                                  {editingKey === `${rowKey}:extra:${param.key}`
                                    ? (
                                        <input
                                          ref={getEditingRef(`${rowKey}:extra:${param.key}`)}
                                          type="text"
                                          value={editingValue}
                                          onChange={event => setEditingValue(event.target.value)}
                                          onBlur={() => {
                                            commitEditing(`${rowKey}:extra:${param.key}`, val => updateItemExtras(item, param.key, val));
                                          }}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              commitEditing(`${rowKey}:extra:${param.key}`, val => updateItemExtras(item, param.key, val));
                                            }
                                            if (event.key === "Escape") {
                                              event.preventDefault();
                                              stopEditing();
                                            }
                                          }}
                                          className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                        />
                                      )
                                    : (
                                        <button
                                          type="button"
                                          className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                          onDoubleClick={() => startEditing(`${rowKey}:extra:${param.key}`, (item.extras?.[param.key] ?? "").toString())}
                                          title="双击编辑"
                                        >
                                          {(item.extras?.[param.key] ?? "--").toString()}
                                        </button>
                                      )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        {isPokemonRule && (
                          <td className="align-top">
                            <div className="text-sm tabular-nums min-h-6 leading-6 px-1">
                              {actionPointText}
                            </div>
                          </td>
                        )}
                        <td className="align-top">
                          <div className="flex items-center gap-2 text-xs text-base-content/70 leading-6">
                            {editingKey === valueEditKey
                              ? (
                                  <input
                                    ref={getEditingRef(valueEditKey)}
                                    type="number"
                                    value={editingValue}
                                    onChange={event => setEditingValue(event.target.value)}
                                    onBlur={() => {
                                      commitEditing(valueEditKey, val => updateItem(item, { value: parseNumberOrZero(val) }));
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        commitEditing(valueEditKey, val => updateItem(item, { value: parseNumberOrZero(val) }));
                                      }
                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        stopEditing();
                                      }
                                    }}
                                    className="input input-xs bg-base-100 border border-base-300 text-right tabular-nums min-h-6 leading-6"
                                  />
                                )
                              : (
                                  <button
                                    type="button"
                                    className="text-right tabular-nums min-h-6 leading-6 px-1 rounded-md border border-base-300 bg-base-100"
                                    onDoubleClick={() => startEditing(valueEditKey, item.value.toString())}
                                    title="双击编辑"
                                  >
                                    {item.value.toString()}
                                  </button>
                                )}

                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="btn btn-ghost btn-square btn-xs text-error hover:bg-error/5 border-none px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="删除"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isPokemonRule && (
                        <tr key={`${rowKey}:multiplier`}>
                          <td colSpan={5} className="pt-0 pb-1">
                            <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                              属性克制倍率
                              {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                              {multiplierText}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isPokemonRule && (
                        <tr key={`${rowKey}:trait`}>
                          <td colSpan={5} className="pt-0 pb-1">
                            <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                              特性
                              {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                              {traitText}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isPokemonRule && itemText && (
                        <tr key={`${rowKey}:item`}>
                          <td colSpan={5} className="pt-0 pb-1">
                            <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                              道具
                              {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                              {itemText}
                            </div>
                          </td>
                        </tr>
                      )}
                      {isPokemonRule && statusText && (
                        <tr key={`${rowKey}:status`}>
                          <td colSpan={5} className="pt-0 pb-1">
                            <div className="text-[11px] text-base-content/60 px-1 whitespace-normal wrap-break-word">
                              状态
                              {"\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                              {statusText}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
        </tbody>
      </table>
    </div>
  );
}
