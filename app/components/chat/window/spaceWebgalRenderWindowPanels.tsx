import type { BatchProgress, RenderableRoom, RoomRenderState } from "./spaceWebgalRenderWindowParts";

import {
  DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD,
  MAX_ROOM_CONTENT_ALERT_THRESHOLD,
  MIN_ROOM_CONTENT_ALERT_THRESHOLD,
} from "@/components/chat/stores/realtimeRenderStore";
import { buildRoomStatusMeta } from "./spaceWebgalRenderWindowParts";

interface SpaceWebgalRoomContentSettingsPanelProps {
  roomContentAlertThreshold: number;
  roomContentAlertThresholdInput: string;
  setRoomContentAlertThreshold: (value: number) => void;
  setRoomContentAlertThresholdInput: (value: string) => void;
  handleSaveRoomContentAlertThreshold: () => void;
}

export function SpaceWebgalRoomContentSettingsPanel({
  roomContentAlertThreshold,
  roomContentAlertThresholdInput,
  setRoomContentAlertThreshold,
  setRoomContentAlertThresholdInput,
  handleSaveRoomContentAlertThreshold,
}: SpaceWebgalRoomContentSettingsPanelProps) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold">单条消息预警阈值</div>
        <div className="text-xs text-base-content/70 mt-1">
          WebGAL 对话框单条文本可见行数有限，建议将超长内容拆分发送，避免右侧只显示前两行。
        </div>
      </div>
      <div className="rounded-md border border-base-300 p-3 space-y-3">
        <div className="text-xs text-base-content/70">
          推荐值：
          {DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD}
          字（中文对话一般可稳定落在两行内）。
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={MIN_ROOM_CONTENT_ALERT_THRESHOLD}
            max={MAX_ROOM_CONTENT_ALERT_THRESHOLD}
            step={1}
            className="input input-bordered input-sm w-44"
            value={roomContentAlertThresholdInput}
            onChange={(event) => {
              setRoomContentAlertThresholdInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSaveRoomContentAlertThreshold();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleSaveRoomContentAlertThreshold}
          >
            保存
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setRoomContentAlertThreshold(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD);
              setRoomContentAlertThresholdInput(String(DEFAULT_ROOM_CONTENT_ALERT_THRESHOLD));
            }}
          >
            恢复推荐值
          </button>
        </div>
        <div className="text-xs text-base-content/70">
          当前阈值：
          {roomContentAlertThreshold}
          字。超过阈值会在左侧输入区提示，并在发送时阻止提交。
        </div>
      </div>
    </div>
  );
}

interface SpaceWebgalBatchStatusPanelProps {
  spaceId: number;
  spaceName?: string;
  renderableRooms: RenderableRoom[];
  roomRenderStateMap: Record<number, RoomRenderState>;
  batchProgress: BatchProgress | null;
}

export function SpaceWebgalBatchStatusPanel({
  spaceId,
  spaceName,
  renderableRooms,
  roomRenderStateMap,
  batchProgress,
}: SpaceWebgalBatchStatusPanelProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(560px,calc(100vw-2rem))] rounded-lg border border-base-300 bg-base-100/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-base-300 px-4 py-3">
        <div className="text-sm font-semibold">房间渲染状态</div>
        <div className="text-xs text-base-content/70">
          {`空间：${spaceName || `#${spaceId}`} | 未删除房间：${renderableRooms.length}`}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="text-xs text-base-content/70 mb-2">
          {`进度：${batchProgress?.current ?? 0}/${batchProgress?.total ?? renderableRooms.length}${batchProgress?.roomName ? `（${batchProgress.roomName}）` : ""}`}
        </div>
        {renderableRooms.length === 0
          ? (
              <div className="text-sm text-base-content/70">暂无可渲染房间。</div>
            )
          : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {renderableRooms.map((room) => {
                  const state = roomRenderStateMap[room.roomId] ?? { status: "idle", messageCount: 0 };
                  const roomStatusMeta = buildRoomStatusMeta(state.status);
                  const roomName = room.name?.trim() || `房间#${room.roomId}`;
                  return (
                    <div key={room.roomId} className="rounded-md border border-base-300 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{roomName}</div>
                          <div className="text-xs text-base-content/70">{`Room ID: ${room.roomId}`}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`badge badge-sm ${roomStatusMeta.badgeClass}`}>{roomStatusMeta.label}</span>
                          <span className="text-xs text-base-content/70">
                            {state.messageCount}
                            {" "}
                            条消息
                          </span>
                        </div>
                      </div>
                      {state.errorMessage && (
                        <div className="text-xs text-error mt-1 truncate" title={state.errorMessage}>
                          {state.errorMessage}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
      </div>
    </div>
  );
}
