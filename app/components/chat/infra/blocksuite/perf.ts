import { isBlocksuiteDebugEnabled } from "./debugFlags";

type BlocksuitePrewarmSource = "idle" | "intent" | "unknown";
type BlocksuiteOpenKind = "cold" | "idle-prewarmed" | "intent-prewarmed" | "runtime-prewarmed";

type BlocksuiteDocPrewarmState = {
  status: "idle" | "running" | "ready";
  source: BlocksuitePrewarmSource;
  startedAt?: number;
  finishedAt?: number;
};

type BlocksuiteRuntimePrewarmState = {
  status: "idle" | "running" | "ready";
  source: BlocksuitePrewarmSource;
  startedAt?: number;
  finishedAt?: number;
  invocationCount: number;
};

type BlocksuiteOpenSession = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
  openKind: BlocksuiteOpenKind;
  startedAt: number;
  runtimePrewarmReadyAtOpen?: number;
  runtimePrewarmSourceAtOpen?: BlocksuitePrewarmSource;
  docIntentPrewarmReadyAtOpen?: number;
  marks: Record<string, number>;
};

export type BlocksuiteOpenPerfSummary = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
  openKind: BlocksuiteOpenKind;
  startedAt: number;
  finishedAt: number;
  totalMs: number;
  frameBootstrapMs?: number;
  editorReadyMs?: number;
  prewarmLeadMs?: number;
  runtimePrewarmMs?: number;
  runtimePrewarmSource?: BlocksuitePrewarmSource;
  marks: Record<string, number>;
};

type BlocksuitePerfState = {
  runtimePrewarm: BlocksuiteRuntimePrewarmState;
  docPrewarmByDocId: Map<string, BlocksuiteDocPrewarmState>;
  sessions: Map<string, BlocksuiteOpenSession>;
  history: BlocksuiteOpenPerfSummary[];
};

const PERF_STATE_KEY = "__tcBlocksuitePerfState_v1";
const PERF_HISTORY_LIMIT = 50;

function now() {
  return Date.now();
}

function getPerfOwner(): Record<string, unknown> {
  let owner: Record<string, unknown> = globalThis as unknown as Record<string, unknown>;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as unknown as Record<string, unknown>;
      }
    }
    catch {
      owner = window as unknown as Record<string, unknown>;
    }
  }

  return owner;
}

function createPerfState(): BlocksuitePerfState {
  return {
    runtimePrewarm: {
      status: "idle",
      source: "unknown",
      invocationCount: 0,
    },
    docPrewarmByDocId: new Map(),
    sessions: new Map(),
    history: [],
  };
}

function getPerfState(): BlocksuitePerfState {
  const owner = getPerfOwner();
  if (!owner[PERF_STATE_KEY]) {
    owner[PERF_STATE_KEY] = createPerfState();
  }
  return owner[PERF_STATE_KEY] as BlocksuitePerfState;
}

function recordDebugLog(message: string, payload?: Record<string, unknown>) {
  try {
    const fn = (globalThis as any).__tcBlocksuiteDebugLog as undefined | ((entry: any) => void);
    fn?.({ source: "BlocksuitePerf", message, payload });
  }
  catch {
    // ignore
  }
}

function emitPerfSummary(summary: BlocksuiteOpenPerfSummary) {
  const owner = getPerfOwner() as any;
  owner.__tcBlocksuitePerfLast = summary;
  owner.__tcBlocksuitePerfHistory = getPerfState().history;

  if ((import.meta as any)?.env?.DEV) {
    console.warn("[BlocksuitePerf]", summary.openKind, summary);
  }

  if (isBlocksuiteDebugEnabled()) {
    recordDebugLog("open-summary", summary as unknown as Record<string, unknown>);
  }
}

export function markBlocksuiteRuntimePrewarmStart(params: {
  source: BlocksuitePrewarmSource;
  docId?: string;
}) {
  const state = getPerfState();
  const at = now();
  state.runtimePrewarm.invocationCount += 1;
  state.runtimePrewarm.status = "running";
  state.runtimePrewarm.source = params.source;
  state.runtimePrewarm.startedAt = at;

  if (params.docId) {
    state.docPrewarmByDocId.set(params.docId, {
      status: "running",
      source: params.source,
      startedAt: at,
    });
  }
}

export function markBlocksuiteRuntimePrewarmReady(params: {
  source: BlocksuitePrewarmSource;
  docId?: string;
}) {
  const state = getPerfState();
  const at = now();
  state.runtimePrewarm.status = "ready";
  state.runtimePrewarm.source = params.source;
  state.runtimePrewarm.finishedAt = at;

  if (params.docId) {
    const prev = state.docPrewarmByDocId.get(params.docId);
    state.docPrewarmByDocId.set(params.docId, {
      status: "ready",
      source: params.source,
      startedAt: prev?.startedAt,
      finishedAt: at,
    });
  }
}

export function markBlocksuiteRuntimePrewarmFailed(params: {
  source: BlocksuitePrewarmSource;
  docId?: string;
}) {
  const state = getPerfState();
  state.runtimePrewarm.status = "idle";

  if (params.docId) {
    state.docPrewarmByDocId.delete(params.docId);
  }
}

export function markBlocksuiteDocIntentPrewarmStart(docId: string) {
  const prev = getPerfState().docPrewarmByDocId.get(docId);
  getPerfState().docPrewarmByDocId.set(docId, {
    status: "running",
    source: "intent",
    startedAt: prev?.startedAt ?? now(),
    finishedAt: prev?.finishedAt,
  });
}

export function markBlocksuiteDocIntentPrewarmReady(docId: string) {
  const prev = getPerfState().docPrewarmByDocId.get(docId);
  getPerfState().docPrewarmByDocId.set(docId, {
    status: "ready",
    source: "intent",
    startedAt: prev?.startedAt ?? now(),
    finishedAt: now(),
  });
}

export function markBlocksuiteDocIntentPrewarmFailed(docId: string) {
  getPerfState().docPrewarmByDocId.delete(docId);
}

export function startBlocksuiteOpenSession(params: {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
}) {
  const state = getPerfState();
  const at = now();
  const runtimePrewarmReadyAtOpen = state.runtimePrewarm.finishedAt;
  const runtimePrewarmSourceAtOpen = state.runtimePrewarm.source;
  const docIntentPrewarmReadyAtOpen = state.docPrewarmByDocId.get(params.docId)?.finishedAt;

  const openKind: BlocksuiteOpenKind = docIntentPrewarmReadyAtOpen
    ? "intent-prewarmed"
    : runtimePrewarmReadyAtOpen
      ? (runtimePrewarmSourceAtOpen === "idle" ? "idle-prewarmed" : "runtime-prewarmed")
      : "cold";

  state.sessions.set(params.instanceId, {
    ...params,
    openKind,
    startedAt: at,
    runtimePrewarmReadyAtOpen,
    runtimePrewarmSourceAtOpen,
    docIntentPrewarmReadyAtOpen,
    marks: {
      "host-open-start": at,
    },
  });
}

export function markBlocksuiteOpenSession(instanceId: string, mark: string) {
  const session = getPerfState().sessions.get(instanceId);
  if (!session) {
    return;
  }
  session.marks[mark] = now();
}

export function failBlocksuiteOpenSession(instanceId: string, errorMessage: string) {
  const state = getPerfState();
  const session = state.sessions.get(instanceId);
  if (!session) {
    return;
  }
  session.marks["open-failed"] = now();
  if (isBlocksuiteDebugEnabled()) {
    recordDebugLog("open-failed", {
      instanceId,
      docId: session.docId,
      workspaceId: session.workspaceId,
      errorMessage,
    });
  }
}

export function finishBlocksuiteOpenSession(instanceId: string): BlocksuiteOpenPerfSummary | null {
  const state = getPerfState();
  const session = state.sessions.get(instanceId);
  if (!session) {
    return null;
  }

  const finishedAt = now();
  const runtimePrewarm = state.runtimePrewarm;
  const frameBootstrapStartAt = session.marks["frame-bootstrap-start"];
  const frameBootstrapReadyAt = session.marks["frame-bootstrap-ready"];
  const renderReadyAt = session.marks["render-ready"] ?? finishedAt;
  const prewarmReadyAt = session.docIntentPrewarmReadyAtOpen ?? session.runtimePrewarmReadyAtOpen;

  const summary: BlocksuiteOpenPerfSummary = {
    instanceId: session.instanceId,
    workspaceId: session.workspaceId,
    docId: session.docId,
    variant: session.variant,
    openKind: session.openKind,
    startedAt: session.startedAt,
    finishedAt: renderReadyAt,
    totalMs: Math.max(0, renderReadyAt - session.startedAt),
    frameBootstrapMs: frameBootstrapStartAt && frameBootstrapReadyAt
      ? Math.max(0, frameBootstrapReadyAt - frameBootstrapStartAt)
      : undefined,
    editorReadyMs: frameBootstrapReadyAt
      ? Math.max(0, renderReadyAt - frameBootstrapReadyAt)
      : undefined,
    prewarmLeadMs: prewarmReadyAt ? Math.max(0, session.startedAt - prewarmReadyAt) : undefined,
    runtimePrewarmMs: runtimePrewarm.startedAt && runtimePrewarm.finishedAt
      ? Math.max(0, runtimePrewarm.finishedAt - runtimePrewarm.startedAt)
      : undefined,
    runtimePrewarmSource: session.runtimePrewarmSourceAtOpen,
    marks: {
      ...session.marks,
      "open-finished": finishedAt,
    },
  };

  state.history.unshift(summary);
  if (state.history.length > PERF_HISTORY_LIMIT) {
    state.history.length = PERF_HISTORY_LIMIT;
  }
  state.sessions.delete(instanceId);
  emitPerfSummary(summary);
  return summary;
}

export function getBlocksuitePerfHistory(): BlocksuiteOpenPerfSummary[] {
  return [...getPerfState().history];
}
