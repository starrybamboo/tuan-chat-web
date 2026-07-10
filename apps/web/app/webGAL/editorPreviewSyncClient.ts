import { getTerreWsUrl } from "@/webGAL/terreConfig";

import { debugRealtimeRender } from "./realtimeRenderDebug";

const EDITOR_PREVIEW_PROTOCOL_V1_SUBPROTOCOL = "webgal-editor-preview-sync.v1";
const PREVIEW_SYNC_SCENE_COMMAND = "preview.command.sync-scene";
const FAST_PREVIEW_TIMEOUT_EVENT = "preview.event.fast-preview-timeout";
const PREVIEW_READY_EVENT = "preview.ready.updated";

type PreviewSyncStatus = "connected" | "disconnected" | "error";

type ProtocolEnvelope = {
  kind?: string;
  type?: string;
  payload?: unknown;
};

export type PreviewSyncScenePayload = {
  sceneName: string;
  sentenceId: number;
};

export type PreviewFastPreviewTimeoutPayload = {
  sceneName?: string;
  sentenceId?: number;
  targetSentenceId?: number;
  forwardedLineCount?: number;
  elapsedMs?: number;
  maxDurationMs?: number;
};

type EditorPreviewSyncClientOptions = {
  onStatusChange?: (status: PreviewSyncStatus) => void;
  onFastPreviewTimeout?: (payload: PreviewFastPreviewTimeoutPayload) => void;
};

function createRequestId(): string {
  return `tc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseProtocolEnvelope(rawData: unknown): ProtocolEnvelope | null {
  if (typeof rawData !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(rawData) as ProtocolEnvelope;
    return parsed && typeof parsed === "object" ? parsed : null;
  }
  catch {
    return null;
  }
}

function isPreviewReadyPayload(value: unknown): value is { ready: boolean } {
  return Boolean(value) && typeof value === "object" && typeof (value as { ready?: unknown }).ready === "boolean";
}

export class EditorPreviewSyncClient {
  private socket: WebSocket | null = null;
  private disposed = false;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSyncScene: PreviewSyncScenePayload | null = null;
  private lastSyncScene: PreviewSyncScenePayload | null = null;

  public constructor(private readonly options: EditorPreviewSyncClientOptions = {}) {}

  public connect(): void {
    if (this.disposed) {
      return;
    }
    if (
      this.socket?.readyState === WebSocket.OPEN
      || this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const wsUrl = getTerreWsUrl();
    if (!wsUrl) {
      console.error("WebGAL V1 预览同步地址未配置");
      this.options.onStatusChange?.("error");
      return;
    }

    try {
      this.socket = new WebSocket(wsUrl, EDITOR_PREVIEW_PROTOCOL_V1_SUBPROTOCOL);
      this.socket.onopen = () => this.handleOpen();
      this.socket.onmessage = event => this.handleMessage(event.data);
      this.socket.onclose = () => this.handleClose();
      this.socket.onerror = error => this.handleError(error);
    }
    catch (error) {
      console.error("WebGAL V1 预览同步连接失败:", error);
      this.options.onStatusChange?.("error");
    }
  }

  public isReady(): boolean {
    return this.connected;
  }

  public sendSyncScene(payload: PreviewSyncScenePayload): boolean {
    if (this.disposed) {
      return false;
    }
    this.lastSyncScene = payload;
    if (!this.sendSyncSceneNow(payload)) {
      this.pendingSyncScene = payload;
      this.connect();
    }
    return true;
  }

  public dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
    this.pendingSyncScene = null;
    this.lastSyncScene = null;
  }

  private handleOpen(): void {
    if (this.disposed) {
      return;
    }
    debugRealtimeRender("WebGAL V1 预览同步 WebSocket 已连接");
    this.connected = true;
    this.options.onStatusChange?.("connected");
    this.flushPendingSyncScene();
  }

  private handleClose(): void {
    if (this.disposed) {
      return;
    }
    debugRealtimeRender("WebGAL V1 预览同步 WebSocket 已断开");
    this.connected = false;
    this.options.onStatusChange?.("disconnected");
    this.scheduleReconnect();
  }

  private handleError(error: unknown): void {
    if (this.disposed) {
      return;
    }
    console.error("WebGAL V1 预览同步 WebSocket 错误:", error);
    this.options.onStatusChange?.("error");
  }

  private handleMessage(rawData: unknown): void {
    const envelope = parseProtocolEnvelope(rawData);
    if (!envelope || envelope.kind !== "event") {
      return;
    }
    if (envelope.type === FAST_PREVIEW_TIMEOUT_EVENT) {
      this.options.onFastPreviewTimeout?.(envelope.payload as PreviewFastPreviewTimeoutPayload);
      return;
    }
    if (envelope.type === PREVIEW_READY_EVENT && isPreviewReadyPayload(envelope.payload) && envelope.payload.ready) {
      this.flushLastSyncScene();
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.disposed) {
        this.connect();
      }
    }, 3000);
  }

  private flushPendingSyncScene(): void {
    const payload = this.pendingSyncScene;
    if (!payload) {
      return;
    }
    if (this.sendSyncSceneNow(payload)) {
      this.pendingSyncScene = null;
    }
  }

  private flushLastSyncScene(): void {
    if (this.lastSyncScene) {
      this.sendSyncSceneNow(this.lastSyncScene);
    }
  }

  private sendSyncSceneNow(payload: PreviewSyncScenePayload): boolean {
    if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.socket.send(JSON.stringify({
        kind: "request",
        type: PREVIEW_SYNC_SCENE_COMMAND,
        requestId: createRequestId(),
        payload,
      }));
      return true;
    }
    catch (error) {
      console.error("发送 WebGAL V1 预览同步消息失败:", error);
      return false;
    }
  }
}
