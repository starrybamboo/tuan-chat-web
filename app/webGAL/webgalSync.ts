/**
 * WebGAL Sync WebSocket 客户端
 *
 * 用于连接 WebGAL Terre 后端的 WebSocket 服务，实现实时同步功能
 *
 * WebSocket 端点:
 * - /api/webgalsync - 用于游戏同步消息广播
 * - /api/lsp2 - 用于 LSP (Language Server Protocol) 支持
 */

export type WebGalSyncMessage = {
  event: "message";
  data: string;
};

export type WebGalSyncStatus = "connecting" | "connected" | "disconnected" | "error";

export type WebGalSyncOptions = {
  /** WebSocket 服务器 URL (例如: ws://localhost:4001) */
  baseUrl: string;
  /** 连接成功回调 */
  onConnect?: () => void;
  /** 断开连接回调 */
  onDisconnect?: (event: CloseEvent) => void;
  /** 收到消息回调 */
  onMessage?: (message: WebGalSyncMessage) => void;
  /** 错误回调 */
  onError?: (error: Event) => void;
  /** 状态变化回调 */
  onStatusChange?: (status: WebGalSyncStatus) => void;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔 (毫秒) */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
};

/**
 * WebGAL Sync WebSocket 客户端类
 *
 * 用于与 WebGAL Terre 后端的 webgalsync 端点通信
 */
export class WebGalSyncClient {
  private socket: WebSocket | null = null;
  private options: Required<WebGalSyncOptions>;
  private status: WebGalSyncStatus = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: string[] = [];

  constructor(options: WebGalSyncOptions) {
    this.options = {
      onConnect: () => {},
      onDisconnect: () => {},
      onMessage: () => {},
      onError: () => {},
      onStatusChange: () => {},
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...options,
    };
  }

  /**
   * 获取当前连接状态
   */
  public getStatus(): WebGalSyncStatus {
    return this.status;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.status === "connected" && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * 连接到 WebSocket 服务器
   */
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.updateStatus("connecting");

    try {
      // 构建 WebSocket URL
      const wsUrl = this.buildWsUrl("/api/webgalsync");
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus("connected");
        this.options.onConnect();

        // 发送队列中的消息
        this.flushMessageQueue();
      };

      this.socket.onclose = (event) => {
        this.updateStatus("disconnected");
        this.options.onDisconnect(event);

        // 自动重连
        if (this.options.autoReconnect && this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebGalSyncMessage;
          this.options.onMessage(message);
        }
        catch (e) {
          console.error("[WebGalSync] Failed to parse message:", e);
        }
      };

      this.socket.onerror = (error) => {
        this.updateStatus("error");
        this.options.onError(error);
      };
    }
    catch (error) {
      console.error("[WebGalSync] Failed to create WebSocket:", error);
      this.updateStatus("error");
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  public disconnect(): void {
    this.cancelReconnect();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.updateStatus("disconnected");
  }

  /**
   * 发送同步消息
   * @param data 消息数据
   */
  public sendMessage(data: string): void {
    const message = JSON.stringify({
      event: "message",
      data,
    });

    if (this.isConnected()) {
      this.socket!.send(message);
    }
    else {
      // 如果未连接，将消息加入队列
      this.messageQueue.push(message);
    }
  }

  /**
   * 发送场景切换命令
   * @param sceneName 场景名称
   */
  public sendSceneChange(sceneName: string): void {
    this.sendMessage(JSON.stringify({
      type: "sceneChange",
      scene: sceneName,
    }));
  }

  /**
   * 发送刷新命令
   */
  public sendRefresh(): void {
    this.sendMessage(JSON.stringify({
      type: "refresh",
    }));
  }

  private buildWsUrl(path: string): string {
    const baseUrl = this.options.baseUrl;
    // 将 http(s) 转换为 ws(s)
    const wsBase = baseUrl.replace(/^http/, "ws");
    return `${wsBase}${path}`;
  }

  private updateStatus(status: WebGalSyncStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange(status);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    // console.log(`[WebGalSync] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.options.reconnectInterval);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket!.send(message);
      }
    }
  }
}

/**
 * 创建 WebGAL Sync 客户端实例
 * @param baseUrl WebSocket 服务器 URL
 * @param options 可选配置
 */
export function createWebGalSyncClient(
  baseUrl: string,
  options?: Partial<Omit<WebGalSyncOptions, "baseUrl">>,
): WebGalSyncClient {
  return new WebGalSyncClient({ baseUrl, ...options });
}
