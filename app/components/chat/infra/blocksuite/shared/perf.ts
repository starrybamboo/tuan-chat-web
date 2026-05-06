import { getBlocksuiteNoErrorCode, reportBlocksuiteError, reportBlocksuiteEvent } from "./blocksuiteReporter";

type BlocksuitePerfMarkName
  = | "host-open-start"
    | "frame-entry-start"
    | "frame-bootstrap-start"
    | "frame-bootstrap-ready"
    | "store-create-start"
    | "editor-create-start"
    | "render-ready"
    | "open-failed";

type BlocksuitePerfSession = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  frameKind: "route";
  startedAt: number;
  finishedAt?: number;
  totalMs?: number;
  frameEntryDelayMs?: number;
  frameAppMountMs?: number;
  frameBootstrapMs?: number;
  editorReadyMs?: number;
  marks: Partial<Record<BlocksuitePerfMarkName, number>>;
};

type PerfOwner = {
  __tcBlocksuitePerfSessions?: Map<string, BlocksuitePerfSession>;
  __tcBlocksuitePerfLast?: BlocksuitePerfSession;
  __tcBlocksuitePerfHistory?: BlocksuitePerfSession[];
};

function getPerfOwner(): PerfOwner {
  let owner: PerfOwner = globalThis as unknown as PerfOwner;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as unknown as PerfOwner;
      }
    }
    catch {
      owner = window as unknown as PerfOwner;
    }
  }

  owner.__tcBlocksuitePerfSessions ??= new Map<string, BlocksuitePerfSession>();
  owner.__tcBlocksuitePerfHistory ??= [];
  return owner;
}

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

function resolvePerfPhase(mark: BlocksuitePerfMarkName): string {
  switch (mark) {
    case "host-open-start":
      return "host-open";
    case "frame-entry-start":
      return "frame-entry";
    case "frame-bootstrap-start":
    case "frame-bootstrap-ready":
      return "frame-bootstrap";
    case "store-create-start":
      return "store-create";
    case "editor-create-start":
      return "editor-create";
    case "render-ready":
      return "render-ready";
    case "open-failed":
      return "startup-failed";
  }
}

export function startBlocksuiteOpenSession(params: {
  instanceId: string;
  workspaceId: string;
  docId: string;
}) {
  const owner = getPerfOwner();
  const startedAt = now();
  const session: BlocksuitePerfSession = {
    instanceId: params.instanceId,
    workspaceId: params.workspaceId,
    docId: params.docId,
    frameKind: "route",
    startedAt,
    marks: {
      "host-open-start": startedAt,
    },
  };
  owner.__tcBlocksuitePerfSessions!.set(params.instanceId, session);

  reportBlocksuiteEvent({
    instanceId: params.instanceId,
    workspaceId: params.workspaceId,
    docId: params.docId,
    phase: resolvePerfPhase("host-open-start"),
    errorCode: getBlocksuiteNoErrorCode(),
    name: "blocksuite-open-start",
    message: "Blocksuite editor host open started",
    details: {
      mark: "host-open-start",
      frameKind: session.frameKind,
    },
  });
}

export function markBlocksuiteOpenSession(instanceId: string, mark: BlocksuitePerfMarkName) {
  if (!instanceId)
    return;

  const owner = getPerfOwner();
  const session = owner.__tcBlocksuitePerfSessions?.get(instanceId);
  if (!session)
    return;

  const at = now();
  session.marks[mark] = at;

  reportBlocksuiteEvent({
    instanceId: session.instanceId,
    workspaceId: session.workspaceId,
    docId: session.docId,
    phase: resolvePerfPhase(mark),
    errorCode: getBlocksuiteNoErrorCode(),
    name: "blocksuite-open-mark",
    message: mark,
    details: {
      mark,
      at,
    },
  });
}

export function failBlocksuiteOpenSession(instanceId: string, errorMessage: string, error?: unknown) {
  if (!instanceId)
    return;

  const owner = getPerfOwner();
  const session = owner.__tcBlocksuitePerfSessions?.get(instanceId);
  if (!session)
    return;

  session.marks["open-failed"] = now();
  reportBlocksuiteError({
    instanceId,
    workspaceId: session.workspaceId,
    docId: session.docId,
    phase: resolvePerfPhase("open-failed"),
    errorCode: "startup-failed",
    name: "blocksuite-open-failed",
    message: errorMessage,
    error,
    toast: {
      id: `blocksuite-startup:${instanceId}`,
      message: errorMessage,
    },
    details: {
      mark: "open-failed",
    },
  });
}

export function finishBlocksuiteOpenSession(instanceId: string) {
  if (!instanceId)
    return null;

  const owner = getPerfOwner();
  const session = owner.__tcBlocksuitePerfSessions?.get(instanceId);
  if (!session)
    return null;

  session.finishedAt = now();
  session.totalMs = session.finishedAt - session.startedAt;

  const hostOpenStart = session.marks["host-open-start"];
  const frameEntryStart = session.marks["frame-entry-start"];
  const bootstrapStart = session.marks["frame-bootstrap-start"];
  const bootstrapReady = session.marks["frame-bootstrap-ready"];

  if (typeof hostOpenStart === "number" && typeof frameEntryStart === "number") {
    session.frameEntryDelayMs = frameEntryStart - hostOpenStart;
  }

  if (typeof frameEntryStart === "number" && typeof bootstrapStart === "number") {
    session.frameAppMountMs = bootstrapStart - frameEntryStart;
  }

  if (typeof bootstrapStart === "number" && typeof bootstrapReady === "number") {
    session.frameBootstrapMs = bootstrapReady - bootstrapStart;
  }

  const renderReady = session.marks["render-ready"];
  if (typeof bootstrapReady === "number" && typeof renderReady === "number") {
    session.editorReadyMs = renderReady - bootstrapReady;
  }

  owner.__tcBlocksuitePerfLast = { ...session, marks: { ...session.marks } };
  owner.__tcBlocksuitePerfHistory = [
    owner.__tcBlocksuitePerfLast,
    ...(owner.__tcBlocksuitePerfHistory ?? []).slice(0, 49),
  ];
  owner.__tcBlocksuitePerfSessions?.delete(instanceId);

  reportBlocksuiteEvent({
    instanceId: session.instanceId,
    workspaceId: session.workspaceId,
    docId: session.docId,
    phase: resolvePerfPhase("render-ready"),
    errorCode: getBlocksuiteNoErrorCode(),
    name: "blocksuite-open-summary",
    message: "Blocksuite editor open summary",
    details: owner.__tcBlocksuitePerfLast as unknown as Record<string, unknown>,
  });

  return owner.__tcBlocksuitePerfLast;
}
