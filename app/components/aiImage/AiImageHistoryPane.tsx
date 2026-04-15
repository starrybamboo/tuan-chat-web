import type { DragEvent, MouseEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";

import type {
  CurrentResultCard,
} from "@/components/aiImage/types";
import type {
  AiImageHistoryMode,
  AiImageHistoryRow,
} from "@/utils/aiImageHistoryDb";
import {
  generatedItemKey,
  historyRowKey,
  historyRowToGeneratedItem,
} from "@/components/aiImage/helpers";
import { ChevronDown, SharpDownload, XMarkICon } from "@/icons";

interface HistoryDragPayload {
  dataUrl: string;
  seed: number;
  batchIndex?: number;
}

interface AiImageHistoryPaneProps {
  isDirectorToolsOpen: boolean;
  onCollapse: () => void;
  history: AiImageHistoryRow[];
  mode: AiImageHistoryMode;
  currentResultCards: CurrentResultCard[];
  archivedHistoryRows: AiImageHistoryRow[];
  selectedHistoryPreviewKey: string | null;
  selectedResultIndex: number;
  directorInputPreviewKey?: string;
  isHistoryExpanded: boolean;
  onHistoryExpandedChange: (expanded: boolean) => void;
  onSelectCurrentResult: (index: number) => void;
  onHistoryRowClick: (row: AiImageHistoryRow, event: MouseEvent<HTMLButtonElement>) => void;
  onHistoryImageDragStart: (
    event: DragEvent<HTMLElement>,
    payload: HistoryDragPayload,
  ) => void;
  onDeleteHistoryRow: (row: AiImageHistoryRow) => void | Promise<void>;
  onDownloadAll: () => void;
  onClearHistory: () => void | Promise<void>;
}

function HistoryDeleteButton({
  label,
  onClick,
}: {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-square btn-xs shrink-0 text-base-content/60 hover:text-error"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <XMarkICon className="size-3.5" />
    </button>
  );
}

export function AiImageHistoryPane({
  isDirectorToolsOpen,
  onCollapse,
  history,
  mode,
  currentResultCards,
  archivedHistoryRows,
  selectedHistoryPreviewKey,
  selectedResultIndex,
  directorInputPreviewKey,
  isHistoryExpanded,
  onHistoryExpandedChange,
  onSelectCurrentResult,
  onHistoryRowClick,
  onHistoryImageDragStart,
  onDeleteHistoryRow,
  onDownloadAll,
  onClearHistory,
}: AiImageHistoryPaneProps) {
  const directorHistoryCardClassName = "rounded-2xl border p-2 transition-colors";
  const directorHistoryCardIdleClassName = "border-base-300 bg-base-100 hover:border-primary/35 hover:bg-base-200/55";
  const directorHistoryCardActiveClassName = "border-primary/45 bg-primary/10";

  if (isDirectorToolsOpen) {
    return (
      <div className="min-h-0 w-[196px] shrink-0 overflow-auto border-l border-base-300 bg-base-100 p-3">
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-base-content/60">History</div>
            <div className="ml-auto text-[11px] text-base-content/45">{history.length ? `${history.length}` : ""}</div>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-xs shrink-0 text-base-content/60 hover:text-base-content"
              aria-label="收起历史记录侧边栏"
              title="收起历史记录侧边栏"
              onClick={onCollapse}
            >
              <CaretRightIcon className="size-3.5" weight="bold" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="mb-4">
              <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/45">Current</div>
              <div className="flex flex-col gap-2">
                {currentResultCards.map(({ item, index, row }) => (
                  <div
                    key={`${item.batchId}-${item.batchIndex}`}
                    className={`${directorHistoryCardClassName} ${directorInputPreviewKey === generatedItemKey(item) ? directorHistoryCardActiveClassName : directorHistoryCardIdleClassName}`}
                  >
                    <button
                      type="button"
                      className="w-full cursor-grab text-left active:cursor-grabbing"
                      draggable
                      onClick={() => onSelectCurrentResult(index)}
                      onDragStart={event => onHistoryImageDragStart(event, {
                        dataUrl: item.dataUrl,
                        seed: item.seed,
                        batchIndex: item.batchIndex,
                      })}
                    >
                      <img src={item.dataUrl} className="h-24 w-full rounded-xl object-cover" alt="director-current-result" />
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-base-content/70">
                        <span className="truncate">{item.toolLabel || "Current"}</span>
                        <span>{`${item.width}×${item.height}`}</span>
                      </div>
                    </button>
                    {row?.id != null
                      ? (
                          <div className="mt-1 flex justify-end">
                            <HistoryDeleteButton
                              label="删除本次绘画记录"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onDeleteHistoryRow(row);
                              }}
                            />
                          </div>
                        )
                      : null}
                  </div>
                ))}
                {!currentResultCards.length ? <div className="px-1 py-2 text-xs text-base-content/45">No Current</div> : null}
              </div>
            </div>

            <details
              className="rounded-2xl border border-base-300 bg-base-200/20 px-2 py-1"
              open={isHistoryExpanded}
              onToggle={(event) => {
                onHistoryExpandedChange(event.currentTarget.open);
              }}
            >
              <summary className="cursor-pointer list-none px-1 py-1" title={isHistoryExpanded ? "折叠历史绘画" : "展开历史绘画"}>
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-base-content/45">History</div>
                  <div className="ml-auto flex items-center gap-2 text-[11px] text-base-content/45">
                    <span>{archivedHistoryRows.length ? `${archivedHistoryRows.length}` : "0"}</span>
                    <ChevronDown className={`size-4 transition-transform ${isHistoryExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </summary>
              <div className="mt-2 flex flex-col gap-2 pb-1">
                {archivedHistoryRows.map(row => (
                  <div
                    key={historyRowKey(row)}
                    className={`${directorHistoryCardClassName} ${directorInputPreviewKey === generatedItemKey(historyRowToGeneratedItem(row)) ? directorHistoryCardActiveClassName : directorHistoryCardIdleClassName}`}
                  >
                    <button
                      type="button"
                      className="w-full cursor-grab text-left active:cursor-grabbing"
                      draggable
                      onClick={event => onHistoryRowClick(row, event)}
                      onDragStart={event => onHistoryImageDragStart(event, {
                        dataUrl: row.dataUrl,
                        seed: row.seed,
                        batchIndex: row.batchIndex ?? undefined,
                      })}
                    >
                      <img src={row.dataUrl} className="h-24 w-full rounded-xl object-cover" alt="director-history" />
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-base-content/70">
                        <span className="truncate">{row.toolLabel || `seed ${row.seed}`}</span>
                        <span>{`${row.width}×${row.height}`}</span>
                      </div>
                    </button>
                    {row.id != null
                      ? (
                          <div className="mt-1 flex justify-end">
                            <HistoryDeleteButton
                              label="删除历史绘画记录"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onDeleteHistoryRow(row);
                              }}
                            />
                          </div>
                        )
                      : null}
                  </div>
                ))}
                {!archivedHistoryRows.length ? <div className="px-1 py-2 text-xs text-base-content/45">No History</div> : null}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 w-[320px] shrink-0 overflow-hidden border-l border-base-300 bg-base-200 p-3">
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2">
          <div className="font-medium">历史记录</div>
          <div className="ml-auto text-xs text-base-content/60">{history.length ? `${history.length} 项` : ""}</div>
          <button
            type="button"
            className="btn btn-ghost btn-square btn-xs shrink-0 text-base-content/60 hover:text-base-content"
            aria-label="收起历史记录侧边栏"
            title="收起历史记录侧边栏"
            onClick={onCollapse}
          >
            <CaretRightIcon className="size-3.5" weight="bold" />
          </button>
        </div>
        <div className="mb-3 rounded-box border border-base-300 bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/60 shadow-sm">
          单击预览，Ctrl/Cmd+单击导入设置，Shift+单击导入 seed，Ctrl/Cmd+Shift+单击导入设置与 seed。
        </div>
        <div className="flex-1 overflow-auto pr-1">
          <div className="flex flex-col gap-3">
            <div className="rounded-box border border-base-300 bg-base-100 p-2 shadow-sm">
              <div className="mb-2 flex items-center gap-2 px-1">
                <div className="font-medium">本次绘画</div>
                <div className="ml-auto text-xs text-base-content/60">{currentResultCards.length ? `${currentResultCards.length} 项` : ""}</div>
              </div>
              <div className="flex flex-col gap-2">
                {currentResultCards.map(({ item, index, row }) => (
                  <div
                    key={`${item.batchId}-${item.batchIndex}`}
                    className={`group flex items-start gap-2 rounded-box border bg-base-100 p-2 shadow-sm transition-colors ${!selectedHistoryPreviewKey && selectedResultIndex === index ? "border-primary" : "border-base-300 hover:border-primary"}`}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 cursor-grab items-center gap-2 text-left active:cursor-grabbing"
                      draggable
                      onClick={() => onSelectCurrentResult(index)}
                      onDragStart={event => onHistoryImageDragStart(event, {
                        dataUrl: item.dataUrl,
                        seed: item.seed,
                        batchIndex: item.batchIndex,
                      })}
                    >
                      <img src={item.dataUrl} className="h-16 w-16 rounded-box object-cover" alt="current-result" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-base-content/70">
                          <span>{row?.mode || mode}</span>
                          <span> · </span>
                          <span>{item.width}</span>
                          <span>×</span>
                          <span>{item.height}</span>
                          {item.batchSize > 1
                            ? (
                                <>
                                  <span> · </span>
                                  <span>{`${item.batchIndex + 1}/${item.batchSize}`}</span>
                                </>
                              )
                            : null}
                        </div>
                        <div className="truncate text-sm">
                          <span>seed: </span>
                          <span>{item.seed}</span>
                        </div>
                        <div className="truncate text-xs text-base-content/60">
                          {row
                            ? (Array.isArray(row.v4Chars) && row.v4Chars.length ? `${row.prompt} · 角色 ${row.v4Chars.length}` : row.prompt)
                            : "当前预览结果"}
                        </div>
                        {row
                          ? (
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-base-content/60">
                                {row.toolLabel ? <span className="badge badge-outline badge-xs">{row.toolLabel}</span> : null}
                                {row.preciseReference ? <span className="badge badge-ghost badge-xs">precise</span> : null}
                                {row.referenceImages?.length ? <span className="badge badge-ghost badge-xs">{`vibe ${row.referenceImages.length}`}</span> : null}
                              </div>
                            )
                          : null}
                      </div>
                    </button>
                    {row?.id != null
                      ? (
                          <HistoryDeleteButton
                            label="删除本次绘画记录"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onDeleteHistoryRow(row);
                            }}
                          />
                        )
                      : null}
                  </div>
                ))}
                {!currentResultCards.length ? <div className="px-1 py-2 text-sm text-base-content/60">暂无本次绘画</div> : null}
              </div>
            </div>

            <details
              className="collapse border border-base-300 bg-base-100 shadow-sm"
              open={isHistoryExpanded}
              onToggle={(event) => {
                onHistoryExpandedChange(event.currentTarget.open);
              }}
            >
              <summary className="collapse-title pr-4" title={isHistoryExpanded ? "折叠历史绘画" : "展开历史绘画"}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">历史绘画</div>
                    <div className="mt-1 text-xs font-normal text-base-content/60">
                      {archivedHistoryRows.length ? `${archivedHistoryRows.length} 项` : "暂无历史绘画"}
                    </div>
                  </div>
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-base-content/60" aria-hidden="true">
                    <ChevronDown className={`size-4 transition-transform ${isHistoryExpanded ? "" : "-rotate-90"}`} />
                  </span>
                </div>
              </summary>
              <div className="collapse-content pt-0">
                <div className="flex flex-col gap-2">
                  {archivedHistoryRows.map(row => (
                    <div
                      key={historyRowKey(row)}
                      className={`group flex items-start gap-2 rounded-box border bg-base-100 p-2 shadow-sm transition-colors ${selectedHistoryPreviewKey === historyRowKey(row) ? "border-primary" : "border-base-300 hover:border-primary"}`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 text-left active:cursor-grabbing"
                        draggable
                        onClick={event => onHistoryRowClick(row, event)}
                        onDragStart={event => onHistoryImageDragStart(event, {
                          dataUrl: row.dataUrl,
                          seed: row.seed,
                          batchIndex: row.batchIndex ?? undefined,
                        })}
                      >
                        <img src={row.dataUrl} className="h-16 w-16 rounded-box object-cover" alt="history" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-base-content/70">
                            <span>{row.mode}</span>
                            <span> · </span>
                            <span>{row.width}</span>
                            <span>×</span>
                            <span>{row.height}</span>
                            {row.batchSize && row.batchSize > 1
                              ? (
                                  <>
                                    <span> · </span>
                                    <span>{`${(row.batchIndex ?? 0) + 1}/${row.batchSize}`}</span>
                                  </>
                                )
                              : null}
                          </div>
                          <div className="truncate text-sm">
                            <span>seed: </span>
                            <span>{row.seed}</span>
                          </div>
                          <div className="truncate text-xs text-base-content/60">
                            {Array.isArray(row.v4Chars) && row.v4Chars.length ? `${row.prompt} · 角色 ${row.v4Chars.length}` : row.prompt}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-base-content/60">
                            {row.toolLabel ? <span className="badge badge-outline badge-xs">{row.toolLabel}</span> : null}
                            {row.preciseReference ? <span className="badge badge-ghost badge-xs">precise</span> : null}
                            {row.referenceImages?.length ? <span className="badge badge-ghost badge-xs">{`vibe ${row.referenceImages.length}`}</span> : null}
                          </div>
                        </div>
                      </button>
                      {row.id != null
                        ? (
                            <HistoryDeleteButton
                              label="删除历史绘画记录"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onDeleteHistoryRow(row);
                              }}
                            />
                          )
                        : null}
                    </div>
                  ))}
                  {!archivedHistoryRows.length ? <div className="text-sm text-base-content/60">暂无历史</div> : null}
                </div>
              </div>
            </details>
          </div>
        </div>
        <div className="mt-3 flex shrink-0 gap-2 border-t border-base-300 pt-3">
          <button
            type="button"
            className="btn btn-sm btn-outline flex-1 gap-2"
            disabled={!history.length}
            onClick={onDownloadAll}
          >
            <SharpDownload className="size-4" />
            <span>Download ZIP</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost flex-1"
            disabled={!history.length}
            onClick={() => void onClearHistory()}
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
