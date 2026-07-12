import type { WebgalPublishJobStatus } from "@/webGAL/publishClient";
import type { InitProgress, RealtimeRenderStatus } from "@/webGAL/useRealtimeRender";

import type { BatchProgress } from "./spaceWebgalRenderWindowParts";

import { Button, buttonClassName } from "@/components/common/Button";
import { TextInput } from "@/components/common/FormField";
import { Badge } from "@/components/common/StatusPrimitives";

import { buildStatusMeta } from "./spaceWebgalRenderWindowParts";

type SpaceWebgalRenderWindowHeaderProps = {
  realtimeStatus: RealtimeRenderStatus;
  realtimeInitProgress: InitProgress | null;
  isRealtimeActive: boolean;
  isBatchRendering: boolean;
  renderPortExpanded: boolean;
  terrePort: number;
  terrePortInput: string;
  terrePortError: string | null;
  webgalEditorUrl: string;
  publishStatus: WebgalPublishJobStatus | null;
  isPublishing: boolean;
  batchProgress: BatchProgress | null;
  onToggleRealtimeRender: () => void;
  onPublish: () => void;
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
  publishStatus,
  isPublishing,
  batchProgress,
  onToggleRealtimeRender,
  onPublish,
  onToggleRenderPortExpanded,
  onTerrePortInputChange,
  onSaveTerrePort,
}: SpaceWebgalRenderWindowHeaderProps) {
  const renderStatusMeta = buildStatusMeta(realtimeStatus);
  const publishedUrl = publishStatus?.deploymentUrl || publishStatus?.branchUrl || "";
  const publishStatusLabel = publishStatus?.status === "running" || publishStatus?.status === "pending"
    ? "发布中"
    : publishStatus?.status === "success"
      ? "已发布"
      : publishStatus?.status === "failed"
        ? "发布失败"
        : "";
  const renderToggleDisabledReason = realtimeStatus === "initializing"
    ? "正在初始化渲染器，暂不可操作"
    : isBatchRendering
      ? "正在批量渲染，暂不可操作"
      : "";

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
          <Badge tone={renderStatusMeta.tone} appearance={renderStatusMeta.appearance}>
            {renderStatusMeta.label}
          </Badge>
          <button
            type="button"
            className="
              size-8 rounded-md flex items-center justify-center
              text-base-content/60
              hover:text-base-content hover:bg-base-200
              transition-colors
            "
            title={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
            aria-label={renderPortExpanded ? "收起渲染端口设置" : "展开渲染端口设置"}
            aria-expanded={renderPortExpanded}
            aria-controls="space-webgal-render-port-settings"
            onClick={onToggleRenderPortExpanded}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`
                size-4 transition-transform duration-200 motion-reduce:transition-none
                ${renderPortExpanded ? `rotate-180` : ""}
              `}
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
        <Button
          variant={isRealtimeActive ? "outline" : "primary"}
          size="sm"
          disabled={realtimeStatus === "initializing" || isBatchRendering}
          onClick={onToggleRealtimeRender}
          loading={realtimeStatus === "initializing" || isBatchRendering}
          title={renderToggleDisabledReason || undefined}
        >
          {isRealtimeActive ? "停止渲染器" : "启动并渲染全部房间"}
        </Button>
        <a
          href={webgalEditorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClassName({ variant: "outline", size: "sm" })}
          title="打开 WebGAL 编辑器"
        >
          打开 WebGAL 编辑器
        </a>
        <Button
          variant="outline"
          size="sm"
          loading={isPublishing}
          disabled={isPublishing}
          onClick={onPublish}
        >
          {isPublishing ? "发布中..." : "发布到 Pages"}
        </Button>
        {publishedUrl && (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({ variant: "outline", size: "sm" })}
            title="打开已发布页面"
          >
            打开发布页
          </a>
        )}
      </div>
      {publishStatusLabel && (
        <div className={`
          mt-3 text-sm
          ${publishStatus?.status === "failed" ? `text-error` : `
            text-base-content/80
          `}
        `}>
          {publishStatusLabel}
          {publishStatus?.status === "failed" && publishStatus.errorMessage ? `：${publishStatus.errorMessage}` : ""}
        </div>
      )}
      {renderPortExpanded && (
        <div id="space-webgal-render-port-settings" className="mt-3 rounded-md border border-base-300 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">{`Terre 端口（当前：${terrePort}）`}</div>
            <div className="flex items-center gap-2">
              <TextInput
                density="compact"
                type="text"
                inputMode="numeric"
                className="w-36"
                placeholder="默认"
                value={terrePortInput}
                onChange={event => onTerrePortInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing)
                    return;
                  if (event.key === "Enter") {
                    onSaveTerrePort();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveTerrePort}
              >
                保存
              </Button>
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
