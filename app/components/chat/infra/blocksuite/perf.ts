import { isBlocksuiteDebugEnabled } from "./debugFlags";

type BlocksuiteFrameKind = "route";

type BlocksuiteOpenSession = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
  frameKind: BlocksuiteFrameKind;
  startedAt: number;
  marks: Record<string, number>;
};

export type BlocksuiteOpenPerfSummary = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
  frameKind: BlocksuiteFrameKind;
  startedAt: number;
  finishedAt: number;
  totalMs: number;
  frameEntryDelayMs?: number;
  frameAppMountMs?: number;
  frameBootstrapMs?: number;
  editorReadyMs?: number;
  marks: Record<string, number>;
};

type BlocksuitePerfState = {
  sessions: Map<string, BlocksuiteOpenSession>;
  history: BlocksuiteOpenPerfSummary[];
};

const PERF_STATE_KEY = "__tcBlocksuitePerfState_v2";
const PERF_HISTORY_LIMIT = 50;

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.timeOrigin + performance.now();
  }
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

function getPerfState(): BlocksuitePerfState {
  const owner = getPerfOwner();
  if (!owner[PERF_STATE_KEY]) {
    owner[PERF_STATE_KEY] = {
      sessions: new Map<string, BlocksuiteOpenSession>(),
      history: [],
    } satisfies BlocksuitePerfState;
  }
  return owner[PERF_STATE_KEY] as BlocksuitePerfState;
}

function recordDebugLog(message: string, payload?: Record<string, unknown>) {
  try {
    const fn = (globalThis as any).__tcBlocksuiteDebugLog as undefined | ((entry: any) => void);
    fn?.({ source: "BlocksuitePerf", message, payload });
  }
  catch {
  }
}

function emitPerfSummary(summary: BlocksuiteOpenPerfSummary) {
  const owner = getPerfOwner() as any;
  owner.__tcBlocksuitePerfLast = summary;
  owner.__tcBlocksuitePerfHistory = getPerfState().history;

  if ((import.meta as any)?.env?.DEV) {
    console.warn("[BlocksuitePerf]", summary);
  }

  if (isBlocksuiteDebugEnabled()) {
    recordDebugLog("open-summary", summary as unknown as Record<string, unknown>);
  }
}

export function startBlocksuiteOpenSession(params: {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
}) {
  const at = now();
  getPerfState().sessions.set(params.instanceId, {
    ...params,
    frameKind: "route",
    startedAt: at,
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
  const frameEntryAt = session.marks["frame-entry-start"];
  const frameBootstrapStartAt = session.marks["frame-bootstrap-start"];
  const frameBootstrapReadyAt = session.marks["frame-bootstrap-ready"];
  const renderReadyAt = session.marks["render-ready"] ?? finishedAt;

  const summary: BlocksuiteOpenPerfSummary = {
    instanceId: session.instanceId,
    workspaceId: session.workspaceId,
    docId: session.docId,
    variant: session.variant,
    frameKind: session.frameKind,
    startedAt: session.startedAt,
    finishedAt: renderReadyAt,
    totalMs: Math.max(0, renderReadyAt - session.startedAt),
    frameEntryDelayMs: frameEntryAt
      ? Math.max(0, frameEntryAt - session.startedAt)
      : undefined,
    frameAppMountMs: frameEntryAt && frameBootstrapStartAt
      ? Math.max(0, frameBootstrapStartAt - frameEntryAt)
      : undefined,
    frameBootstrapMs: frameBootstrapStartAt && frameBootstrapReadyAt
      ? Math.max(0, frameBootstrapReadyAt - frameBootstrapStartAt)
      : undefined,
    editorReadyMs: frameBootstrapReadyAt
      ? Math.max(0, renderReadyAt - frameBootstrapReadyAt)
      : undefined,
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
