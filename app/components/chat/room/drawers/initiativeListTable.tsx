import type { Initiative, InitiativeParam } from "./initiativeListTypes";
import { Fragment } from "react";

import { parseNullableNumber, parseNumberOrZero } from "./initiativeListAbilityExtractors";

interface InitiativeListTableProps {
  initiativeList: Initiative[];
  sortedList: Initiative[];
  displayParams: InitiativeParam[];
  editingKey: string | null;
  editingValue: string;
  getEditingRef: (key: string) => (node: HTMLInputElement | null) => void;
  setEditingValue: (value: string) => void;
  startEditing: (key: string, value: string) => void;
  stopEditing: () => void;
  commitEditing: (key: string, apply: (value: string) => void) => void;
  updateItem: (item: Initiative, patch: Partial<Initiative>) => void;
  updateItemExtras: (item: Initiative, key: string, value: string) => void;
  handleDelete: (item: Initiative) => void;
}

function formatCellValue(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "--";
  }
  return String(value);
}

function StatusPills({ item }: { item: Initiative }) {
  if (!item.activeStates || item.activeStates.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {item.activeStates.map(state => (
        <span
          key={state}
          className="rounded-full border border-base-300 bg-base-100 px-1.5 py-0.5 text-[10px] leading-none text-base-content/60"
        >
          {state}
        </span>
      ))}
    </div>
  );
}

export function InitiativeListTable({
  initiativeList,
  sortedList,
  displayParams,
  editingKey,
  editingValue,
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
            <th className="text-xs font-semibold text-base-content/70">角色名</th>
            <th className="text-xs font-semibold text-base-content/70">HP</th>
            <th className="text-xs font-semibold text-base-content/70">先攻</th>
          </tr>
        </thead>
        <tbody>
          {initiativeList.length === 0
            ? (
                <tr>
                  <td colSpan={3} className="text-xs text-base-content/50 text-center py-4">
                    暂无先攻记录，添加或导入一个参与者吧。
                  </td>
                </tr>
              )
            : (
                sortedList.map((item, index) => {
                  const hp = item.hp ?? null;
                  const maxHp = item.maxHp ?? null;
                  const rowKey = item.participantId || item.name || `${index}`;
                  const nameEditKey = `${rowKey}:name`;
                  const hpEditKey = `${rowKey}:hp`;
                  const maxHpEditKey = `${rowKey}:maxHp`;
                  const valueEditKey = `${rowKey}:value`;

                  return (
                    <Fragment key={rowKey}>
                      <tr className="group hover">
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
                          <StatusPills item={item} />
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
                                          onDoubleClick={() => startEditing(`${rowKey}:extra:${param.key}`, formatCellValue(item.extras?.[param.key] === "--" ? "" : item.extras?.[param.key]))}
                                          title="双击编辑"
                                        >
                                          {formatCellValue(item.extras?.[param.key])}
                                        </button>
                                      )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
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
                              x
                            </button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
        </tbody>
      </table>
    </div>
  );
}
