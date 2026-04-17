import type { DragEvent, MouseEvent } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useState } from "react";

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

interface HistoryImageTileProps {
  active: boolean;
  alt: string;
  dataUrl: string;
  draggable?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDelete?: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  title: string;
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
      className="btn btn-ghost btn-square btn-xs shrink-0 opacity-0 transition-opacity hover:text-error group-focus-within:opacity-100 group-hover:opacity-100"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <XMarkICon className="size-3.5" />
    </button>
  );
}

function HistoryHint() {
  const hintText = "单击预览，Ctrl/Cmd+单击导入设置，Shift+单击导入 seed，Ctrl/Cmd+Shift+单击导入设置与 seed。";
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const showTooltipAtPointer = (event: MouseEvent<HTMLButtonElement>) => {
    setTooltipState({
      x: event.clientX,
      y: event.clientY,
      visible: true,
    });
  };

  const showTooltipAtButton = (event: React.FocusEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipState({
      x: rect.left,
      y: rect.bottom,
      visible: true,
    });
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="flex size-5 cursor-help items-center justify-center rounded-full bg-transparent text-base-content/42 transition hover:text-base-content/72 focus:outline-none"
        aria-label={hintText}
        onBlur={() => setTooltipState(prev => ({ ...prev, visible: false }))}
        onFocus={showTooltipAtButton}
        onMouseEnter={showTooltipAtPointer}
        onMouseLeave={() => setTooltipState(prev => ({ ...prev, visible: false }))}
        onMouseMove={showTooltipAtPointer}
      >
        <span className="flex size-4 items-center justify-center rounded-full border border-base-content/28 text-[10px] font-semibold leading-none text-current">
          ?
        </span>
      </button>
      {tooltipState.visible
        ? (
            <div
              className="pointer-events-none fixed z-30 flex h-[80px] w-[300px] items-center rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/72 shadow-xl"
              style={{
                left: tooltipState.x,
                top: tooltipState.y,
                transform: "translate(calc(-100% - 10px), 10px)",
              }}
            >
              {hintText}
            </div>
          )
        : null}
    </div>
  );
}

function HistoryImageTile({
  active,
  alt,
  dataUrl,
  draggable = false,
  onClick,
  onDelete,
  onDragStart,
  title,
}: HistoryImageTileProps) {
  return (
    <div className={`group relative w-[100px] overflow-hidden rounded-xl border bg-base-100 shadow-sm transition-colors ${active ? "border-primary shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-base-300 hover:border-primary/45"}`}>
      <button
        type="button"
        className="relative block h-[100px] w-[100px] cursor-grab overflow-hidden text-left active:cursor-grabbing"
        draggable={draggable}
        title={title}
        onClick={onClick}
        onDragStart={onDragStart}
      >
        <img src={dataUrl} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" alt={alt} />
      </button>

      {onDelete
        ? (
            <button
              type="button"
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-md bg-base-100/92 text-base-content/65 opacity-0 shadow-sm transition hover:bg-base-100 hover:text-error group-focus-within:opacity-100 group-hover:opacity-100"
              aria-label="删除绘画记录"
              title="删除绘画记录"
              onClick={onDelete}
            >
              <XMarkICon className="size-3.5" />
            </button>
          )
        : null}
    </div>
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
  const directorHistoryCardClassName = "group rounded-2xl border p-2 transition-colors";
  const directorHistoryCardIdleClassName = "border-base-300 bg-base-100 hover:border-primary/35 hover:bg-base-200/55";
  const directorHistoryCardActiveClassName = "border-primary/45 bg-primary/10";

  if (isDirectorToolsOpen) {
    return (
      <div className="min-h-0 w-[196px] shrink-0 overflow-auto border-l border-[#D6DCE3] bg-[#F3F5F7] p-3 dark:border-[#2A3138] dark:bg-[#161A1F]">
        <div className="flex h-full flex-col">
          <div className="mb-3 flex items-center gap-2 px-1">
            <div className="flex items-center gap-1">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-base-content/60">History</div>
              <HistoryHint />
            </div>
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
                      <img src={item.dataUrl} className="mx-auto h-[100px] w-[100px] rounded-xl object-cover" alt="director-current-result" />
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
              className="rounded-2xl border border-[#D6DCE3] bg-[#F3F5F7] px-2 py-1 dark:border-[#2A3138] dark:bg-[#161A1F]"
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
                      <img src={row.dataUrl} className="mx-auto h-[100px] w-[100px] rounded-xl object-cover" alt="director-history" />
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
    <div className="min-h-0 w-[160px] shrink-0 overflow-hidden border-l border-[#D6DCE3] bg-[#F3F5F7] p-3 dark:border-[#2A3138] dark:bg-[#161A1F]">
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">History</div>
            <HistoryHint />
          </div>
          <div className="ml-auto text-xs text-base-content/55">{history.length ? `${history.length}` : ""}</div>
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
        <div className="flex-1 overflow-auto pr-1">
          <div className="grid grid-cols-1 justify-items-center gap-2 border-t border-[#D6DCE3] py-3 dark:border-[#2A3138]">
            {currentResultCards.map(({ item, index, row }) => (
              <HistoryImageTile
                key={`${item.batchId}-${item.batchIndex}`}
                active={!selectedHistoryPreviewKey && selectedResultIndex === index}
                alt="current-result"
                dataUrl={item.dataUrl}
                draggable
                title={`${row?.mode || mode} · seed ${item.seed} · ${item.width}×${item.height}`}
                onClick={() => onSelectCurrentResult(index)}
                onDelete={row?.id != null
                  ? (event) => {
                      event.stopPropagation();
                      void onDeleteHistoryRow(row);
                    }
                  : undefined}
                onDragStart={event => onHistoryImageDragStart(event, {
                  dataUrl: item.dataUrl,
                  seed: item.seed,
                  batchIndex: item.batchIndex,
                })}
              />
            ))}
            {archivedHistoryRows.map(row => (
              <HistoryImageTile
                key={historyRowKey(row)}
                active={selectedHistoryPreviewKey === historyRowKey(row)}
                alt="history"
                dataUrl={row.dataUrl}
                draggable
                title={`${row.mode} · seed ${row.seed} · ${row.width}×${row.height}`}
                onClick={event => onHistoryRowClick(row, event)}
                onDelete={row.id != null
                  ? (event) => {
                      event.stopPropagation();
                      void onDeleteHistoryRow(row);
                    }
                  : undefined}
                onDragStart={event => onHistoryImageDragStart(event, {
                  dataUrl: row.dataUrl,
                  seed: row.seed,
                  batchIndex: row.batchIndex ?? undefined,
                })}
              />
            ))}
            {!currentResultCards.length && !archivedHistoryRows.length
              ? <div className="col-span-1 w-full rounded-xl border border-dashed border-base-300 bg-base-100 px-3 py-5 text-center text-sm text-base-content/55">暂无绘画记录</div>
              : null}
          </div>
        </div>
        <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-[#D6DCE3] pt-3 dark:border-[#2A3138]">
          <button
            type="button"
            className="btn btn-sm btn-outline w-full gap-2"
            disabled={!history.length}
            onClick={onDownloadAll}
          >
            <SharpDownload className="size-4" />
            <span>Download ZIP</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost w-full"
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
