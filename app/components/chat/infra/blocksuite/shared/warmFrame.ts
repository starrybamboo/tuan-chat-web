import type { BlocksuiteFrameSyncParams } from "./frameProtocol";

import {
  getBlocksuiteFrameTargetOrigin,
  postBlocksuiteFrameMessage,
  readBlocksuiteFrameMessageFromEvent,
} from "./frameProtocol";
import {
  createBlocksuiteFramePrewarmParams,
  createBlocksuiteFramePrewarmSrc,
} from "./frameSrc";

const BLOCKSUITE_WARM_FRAME_KEY = "__tcBlocksuiteWarmFrameState";
const BLOCKSUITE_WARM_FRAME_READY_TIMEOUT_MS = 15000;

type BlocksuiteWarmFrameRecord = {
  iframe: HTMLIFrameElement;
  hiddenRoot: HTMLDivElement;
  claimed: boolean;
  isReady: boolean;
  readyPromise: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
  dispose: () => void;
};

type BlocksuiteWarmFrameState = {
  record: BlocksuiteWarmFrameRecord | null;
};

type BlocksuiteWarmFrameOwner = Window & {
  __tcBlocksuiteWarmFrameState?: BlocksuiteWarmFrameState;
};

function getWarmFrameOwner(): BlocksuiteWarmFrameOwner {
  if (typeof window === "undefined") {
    throw new TypeError("Blocksuite warm frame is only available in the browser");
  }

  try {
    const top = window.top;
    if (top && top.location?.origin === window.location.origin) {
      return top as BlocksuiteWarmFrameOwner;
    }
  }
  catch {
  }

  return window as BlocksuiteWarmFrameOwner;
}

function getWarmFrameState(): BlocksuiteWarmFrameState {
  const owner = getWarmFrameOwner();
  owner[BLOCKSUITE_WARM_FRAME_KEY] ??= { record: null };
  return owner[BLOCKSUITE_WARM_FRAME_KEY]!;
}

function getWarmFrameRecord(): BlocksuiteWarmFrameRecord | null {
  const state = getWarmFrameState();
  const record = state.record;
  if (!record) {
    return null;
  }

  if (!record.iframe.isConnected && !record.claimed) {
    record.dispose();
    state.record = null;
    return null;
  }

  return record;
}

function applyHiddenIframePresentation(iframe: HTMLIFrameElement) {
  iframe.title = "blocksuite-editor-prewarm";
  iframe.allow = "clipboard-read; clipboard-write; fullscreen";
  iframe.allowFullscreen = true;
  iframe.className = "block border-0 bg-transparent";
  iframe.style.position = "absolute";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.visibility = "hidden";
  iframe.style.backgroundColor = "transparent";
}

function ensureHiddenRoot(): HTMLDivElement {
  const existing = getWarmFrameRecord()?.hiddenRoot;
  if (existing?.isConnected) {
    return existing;
  }

  const root = document.createElement("div");
  root.dataset.tcBlocksuiteWarmFrameRoot = "1";
  root.style.position = "fixed";
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "0";
  root.style.height = "0";
  root.style.overflow = "hidden";
  root.style.opacity = "0";
  root.style.pointerEvents = "none";
  root.style.zIndex = "-1";
  document.body.append(root);
  return root;
}

function createPrewarmSyncParams(): BlocksuiteFrameSyncParams {
  const params = createBlocksuiteFramePrewarmParams();
  return {
    workspaceId: params.workspaceId,
    docId: params.docId,
    readOnly: params.readOnly,
    allowModeSwitch: params.allowModeSwitch,
    fullscreenEdgeless: params.fullscreenEdgeless,
    mode: params.mode,
    tcHeader: params.tcHeader,
    editorInstanceId: "",
    prewarmOnly: true,
  };
}

function syncWarmFrameBackToPrewarm(iframe: HTMLIFrameElement) {
  postBlocksuiteFrameMessage({
    targetWindow: iframe.contentWindow,
    payload: {
      type: "sync-params",
      ...createPrewarmSyncParams(),
    },
    targetOrigin: getBlocksuiteFrameTargetOrigin(),
  });
}

function createWarmFrameRecord(): BlocksuiteWarmFrameRecord {
  const hiddenRoot = ensureHiddenRoot();
  const iframe = document.createElement("iframe");
  applyHiddenIframePresentation(iframe);
  iframe.src = createBlocksuiteFramePrewarmSrc();

  let resolved = false;
  let timeoutId: number | null = null;
  let resolveReady = () => {};
  let rejectReady = (_error: Error) => {};

  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      resolve();
    };
    rejectReady = (error: Error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      reject(error);
    };
  });

  let record!: BlocksuiteWarmFrameRecord;

  const onMessage = (event: MessageEvent) => {
    const message = readBlocksuiteFrameMessageFromEvent({
      event,
      expectedOrigin: window.location.origin,
      expectedSource: iframe.contentWindow,
    });
    if (!message || message.type !== "render-ready") {
      return;
    }
    record.resolveReady();
  };

  const onError = () => {
    record.rejectReady(new TypeError("Blocksuite warm frame failed to load"));
    const state = getWarmFrameState();
    if (state.record === record) {
      state.record = null;
    }
    record.dispose();
  };

  record = {
    iframe,
    hiddenRoot,
    claimed: false,
    isReady: false,
    readyPromise,
    resolveReady: () => {
      record.isReady = true;
      resolveReady();
    },
    rejectReady,
    dispose: () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("error", onError);
      iframe.remove();
      if (hiddenRoot.isConnected && hiddenRoot.childElementCount === 0) {
        hiddenRoot.remove();
      }
    },
  };

  window.addEventListener("message", onMessage);
  iframe.addEventListener("error", onError);
  timeoutId = window.setTimeout(() => {
    onError();
  }, BLOCKSUITE_WARM_FRAME_READY_TIMEOUT_MS);

  hiddenRoot.append(iframe);
  return record;
}

function resolveWarmFrameReadyResult(
  state: BlocksuiteWarmFrameState,
  record: BlocksuiteWarmFrameRecord,
): Promise<boolean> {
  return record.readyPromise.then(() => true).catch(() => {
    if (state.record === record) {
      state.record = null;
    }
    return false;
  });
}

export function ensurePrewarmedBlocksuiteFrame(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }

  const state = getWarmFrameState();
  const existing = getWarmFrameRecord();
  if (existing) {
    return resolveWarmFrameReadyResult(state, existing);
  }

  try {
    const record = createWarmFrameRecord();
    state.record = record;
    return resolveWarmFrameReadyResult(state, record);
  }
  catch {
    state.record = null;
    return Promise.resolve(false);
  }
}

export function takePrewarmedBlocksuiteFrame(): HTMLIFrameElement | null {
  const record = getWarmFrameRecord();
  // 只有收到 render-ready 的 warm frame 才能被正式编辑器认领，
  // 否则预热页后续超时/报错时会把宿主里已挂载的 iframe 一并 dispose 掉。
  if (!record || record.claimed || !record.isReady) {
    return null;
  }

  record.claimed = true;
  return record.iframe;
}

export function releasePrewarmedBlocksuiteFrame(iframe: HTMLIFrameElement) {
  const state = getWarmFrameState();
  const record = state.record;
  if (!record || record.iframe !== iframe) {
    return;
  }

  record.claimed = false;
  applyHiddenIframePresentation(record.iframe);
  record.hiddenRoot.append(record.iframe);
  syncWarmFrameBackToPrewarm(record.iframe);
}

export function resetBlocksuiteWarmFrameForTests() {
  const state = getWarmFrameState();
  state.record?.dispose();
  state.record = null;
}
