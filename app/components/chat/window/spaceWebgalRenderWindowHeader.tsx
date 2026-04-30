import type { BatchProgress } from "./spaceWebgalRenderWindowParts";
import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

import { buildStatusMeta } from "./spaceWebgalRenderWindowParts";

interface SpaceWebgalRenderWindowHeaderProps {
  realtimeStatus: RealtimeRenderStatus;
  realtimeInitProgress: InitProgress | null;
  isRealtimeActive: boolean;
  isBatchRendering: boolean;
  renderPortExpanded: boolean;
  terrePort: number;
  terrePortInput: string;
  terrePortError: string | null;
  webgalEditorUrl: string;
  batchProgress: BatchProgress | null;
  onToggleRealtimeRender: () => void;
  onToggleRenderPortExpanded: () => void;
  onTerrePortInputChange: (value: string) => void;
  onSaveTerrePort: () => void;
}

export function SpaceWebgalRenderWindowHeader({
  realtimeStatus,
  realtimeInitProgress,
  isRealtimeActive,
  isBatchRendering,
  renderPortExpanded,
  terrePort,
  terrePortInput,
  terrePortError,
  webgalEditorUrl,
  batchProgress,
  onToggleRealtimeRender,
  onToggleRenderPortExpanded,
  onTerrePortInputChange,
  onSaveTerrePort,
}: SpaceWebgalRenderWindowHeaderProps) {
  const renderStatusMeta = buildStatusMeta(realtimeStatus);

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold">空间级 WebGAL 渲染</div>
          <div className="text-xs text-base-content/70 mt-1">
            游戏名使用空间名称+ID，渲染范围为当前空间下所有未删除房间。
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`badge ${renderStatusMeta.badgeClass}`}>{renderStatusMeta.label}</div>
          <button
            type="button"
            className="h-8 w-8 rounded-md flex items-center justify-center text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
            title={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
            aria-label={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
            onClick={onToggleRenderPortExpanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform duration-200 ${renderPortExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${isRealtimeActive ? "btn-outline" : "btn-primary"}`}
          disabled={realtimeStatus === "initializing" || isBatchRendering}
          onClick={onToggleRealtimeRender}
        >
          {isRealtimeActive ? "停止渲染器" : "启动并渲染全部房间"}
        </button>
        <a
          href={webgalEditorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
          title="打开 WebGAL 编辑器"
        >
          打开 WebGAL 编辑器
        </a>
      </div>
      {renderPortExpanded && (
        <div className="mt-3 rounded-md border border-base-300 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">{`Terre 端口（当前：${terrePort}）`}</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                className="input input-bordered input-sm w-36"
                placeholder="默认"
                value={terrePortInput}
                onChange={event => onTerrePortInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSaveTerrePort();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={onSaveTerrePort}
              >
                保存
              </button>
            </div>
          </div>
          {terrePortError && <div className="text-xs text-error mt-1">{terrePortError}</div>}
        </div>
      )}

      {batchProgress && (
        <div className="mt-3 text-sm text-base-content/80">
          正在渲染：
          {batchProgress.current}
          /
          {batchProgress.total}
          {batchProgress.roomName ? `（${batchProgress.roomName}）` : ""}
        </div>
      )}
      {realtimeInitProgress && realtimeStatus === "initializing" && (
        <div className="mt-2 text-xs text-base-content/70">
          {realtimeInitProgress.message}
        </div>
      )}
    </div>
  );
}
