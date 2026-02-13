import { base64ToUint8Array, uint8ArrayToBase64 } from "@/components/chat/infra/blocksuite/base64";
import { handleUnauthorized } from "@/utils/auth/unauthorized";

export type BlocksuiteDocKey = {
  entityType: string;
  entityId: number;
  docType: string;
};

type WsMessage<T = any> = {
  type: number;
  data?: T;
};

const WS_URL = import.meta.env.VITE_API_WS_URL as string;

// Keep these numbers in sync with TuanChat WSReqTypeEnum / WSRespTypeEnum.
const WS_REQ_HEARTBEAT = 2;
const WS_REQ_BLOCKSUITE_JOIN = 200;
const WS_REQ_BLOCKSUITE_LEAVE = 201;
const WS_REQ_BLOCKSUITE_PUSH_UPDATE = 202;
const WS_REQ_BLOCKSUITE_AWARENESS = 203;

const WS_RESP_BLOCKSUITE_DOC_UPDATE = 200;
const WS_RESP_BLOCKSUITE_DOC_AWARENESS = 201;
const WS_RESP_BLOCKSUITE_DOC_UPDATE_ACK = 202;
const WS_RESP_INVALIDATE_TOKEN = 100;

function buildRoomKey(key: BlocksuiteDocKey) {
  return `${key.entityType}:${key.entityId}:${key.docType}`;
}

type UpdateListener = (params: { update: Uint8Array; updateId?: number; serverTime?: number; editorId?: number }) => void;
type AwarenessListener = (params: { awarenessUpdate: string; editorId?: number }) => void;
type AckListener = (params: { updateId?: number; serverTime?: number }) => void;

class BlocksuiteWsClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private suppressReconnect = false;

  private readonly joined = new Set<string>();
  private readonly updateListeners = new Map<string, Set<UpdateListener>>();
  private readonly awarenessListeners = new Map<string, Set<AwarenessListener>>();
  private readonly ackListeners = new Map<string, Set<AckListener>>();

  private readCurrentToken() {
    return (typeof window !== "undefined" ? window.localStorage.getItem("token") : null)?.trim() || "";
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const token = this.readCurrentToken();
    if (!token) {
      this.stopHeartbeat();
      if (this.reconnectTimer != null) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.ws) {
        this.suppressReconnect = true;
        this.ws.close();
        this.ws = null;
      }
      return;
    }

    const wsUrl = `${WS_URL}?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.suppressReconnect = false;
      this.startHeartbeat();
      for (const roomKey of this.joined) {
        this.sendRaw({ type: WS_REQ_BLOCKSUITE_JOIN, data: this.parseRoomKey(roomKey) });
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;

      if (this.reconnectTimer != null) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      if (this.suppressReconnect) {
        this.suppressReconnect = false;
        return;
      }

      if (!this.readCurrentToken()) {
        return;
      }
      // Fast reconnect is enough here; the editor has snapshot pull as a fallback.
      this.reconnectTimer = window.setTimeout(() => this.connect(), 800);
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg: WsMessage<any> = JSON.parse(ev.data);
        if (msg?.type === WS_RESP_INVALIDATE_TOKEN) {
          this.handleTokenInvalid();
          return;
        }
        this.onMessage(msg);
      }
      catch {
        // ignore
      }
    };
  }

  private startHeartbeat() {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer);
    }
    // Server closes idle connections; reuse the existing heartbeat protocol.
    this.heartbeatTimer = window.setInterval(() => {
      this.sendRaw({ type: WS_REQ_HEARTBEAT });
    }, 25_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer != null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleTokenInvalid() {
    this.suppressReconnect = true;
    this.stopHeartbeat();
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    handleUnauthorized({ source: "ws" });
  }

  private sendRaw(msg: WsMessage<any>) {
    this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  isOpen() {
    return !!this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  private onMessage(msg: WsMessage<any>) {
    if (!msg || typeof msg.type !== "number") {
      return;
    }

    if (msg.type === WS_RESP_BLOCKSUITE_DOC_UPDATE) {
      const data = msg.data as any;
      const roomKey = data ? `${data.entityType}:${data.entityId}:${data.docType}` : null;
      if (!roomKey) {
        return;
      }
      const listeners = this.updateListeners.get(roomKey);
      if (!listeners || !listeners.size) {
        return;
      }
      const updateB64 = data.updateB64 as string | undefined;
      if (!updateB64) {
        return;
      }
      const update = base64ToUint8Array(updateB64);
      for (const cb of listeners) {
        cb({ update, updateId: data.updateId, serverTime: data.serverTime, editorId: data.editorId });
      }
      return;
    }

    if (msg.type === WS_RESP_BLOCKSUITE_DOC_AWARENESS) {
      const data = msg.data as any;
      const roomKey = data ? `${data.entityType}:${data.entityId}:${data.docType}` : null;
      if (!roomKey) {
        return;
      }
      const listeners = this.awarenessListeners.get(roomKey);
      if (!listeners || !listeners.size) {
        return;
      }
      const awarenessUpdate = data.awarenessUpdate as string | undefined;
      if (!awarenessUpdate) {
        return;
      }
      for (const cb of listeners) {
        cb({ awarenessUpdate, editorId: data.editorId });
      }
      return;
    }

    if (msg.type === WS_RESP_BLOCKSUITE_DOC_UPDATE_ACK) {
      const data = msg.data as any;
      const roomKey = data ? `${data.entityType}:${data.entityId}:${data.docType}` : null;
      if (!roomKey) {
        return;
      }
      const listeners = this.ackListeners.get(roomKey);
      if (!listeners || !listeners.size) {
        return;
      }
      for (const cb of listeners) {
        cb({ updateId: data.updateId, serverTime: data.serverTime });
      }
    }
  }

  private parseRoomKey(roomKey: string): BlocksuiteDocKey {
    const [entityType, rawId, docType] = roomKey.split(":");
    return { entityType, entityId: Number(rawId), docType };
  }

  joinDoc(key: BlocksuiteDocKey) {
    const roomKey = buildRoomKey(key);
    this.joined.add(roomKey);
    this.sendRaw({ type: WS_REQ_BLOCKSUITE_JOIN, data: { ...key, clientVersion: "tuan-chat-web" } });
  }

  leaveDoc(key: BlocksuiteDocKey) {
    const roomKey = buildRoomKey(key);
    this.joined.delete(roomKey);
    this.sendRaw({ type: WS_REQ_BLOCKSUITE_LEAVE, data: key });
  }

  pushUpdate(key: BlocksuiteDocKey, update: Uint8Array, clientId?: string) {
    this.sendRaw({
      type: WS_REQ_BLOCKSUITE_PUSH_UPDATE,
      data: { ...key, updateB64: uint8ArrayToBase64(update), clientId },
    });
  }

  /**
   * 仅当 WS 处于 OPEN 状态时才发送（用于离线/断线时避免“以为发出去了”的误判）。
   */
  tryPushUpdateIfOpen(key: BlocksuiteDocKey, update: Uint8Array, clientId?: string) {
    if (!this.isOpen()) {
      return false;
    }
    this.ws!.send(JSON.stringify({
      type: WS_REQ_BLOCKSUITE_PUSH_UPDATE,
      data: { ...key, updateB64: uint8ArrayToBase64(update), clientId },
    }));
    return true;
  }

  pushAwareness(key: BlocksuiteDocKey, awarenessUpdate: string) {
    this.sendRaw({
      type: WS_REQ_BLOCKSUITE_AWARENESS,
      data: { ...key, awarenessUpdate },
    });
  }

  onUpdate(key: BlocksuiteDocKey, cb: UpdateListener) {
    const roomKey = buildRoomKey(key);
    const set = this.updateListeners.get(roomKey) ?? new Set<UpdateListener>();
    set.add(cb);
    this.updateListeners.set(roomKey, set);
    return () => {
      const cur = this.updateListeners.get(roomKey);
      if (!cur) {
        return;
      }
      cur.delete(cb);
      if (!cur.size) {
        this.updateListeners.delete(roomKey);
      }
    };
  }

  onAwareness(key: BlocksuiteDocKey, cb: AwarenessListener) {
    const roomKey = buildRoomKey(key);
    const set = this.awarenessListeners.get(roomKey) ?? new Set<AwarenessListener>();
    set.add(cb);
    this.awarenessListeners.set(roomKey, set);
    return () => {
      const cur = this.awarenessListeners.get(roomKey);
      if (!cur) {
        return;
      }
      cur.delete(cb);
      if (!cur.size) {
        this.awarenessListeners.delete(roomKey);
      }
    };
  }

  onAck(key: BlocksuiteDocKey, cb: AckListener) {
    const roomKey = buildRoomKey(key);
    const set = this.ackListeners.get(roomKey) ?? new Set<AckListener>();
    set.add(cb);
    this.ackListeners.set(roomKey, set);
    return () => {
      const cur = this.ackListeners.get(roomKey);
      if (!cur) {
        return;
      }
      cur.delete(cb);
      if (!cur.size) {
        this.ackListeners.delete(roomKey);
      }
    };
  }
}

export const blocksuiteWsClient = new BlocksuiteWsClient();
