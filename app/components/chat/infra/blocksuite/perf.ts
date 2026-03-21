type BlocksuitePerfMarkName =
  | "host-open-start"
  | "frame-bootstrap-start"
  | "frame-bootstrap-ready"
  | "store-create-start"
  | "editor-create-start"
  | "render-ready";

type BlocksuitePerfSession = {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
  frameKind: "route";
  startedAt: number;
  finishedAt?: number;
  totalMs?: number;
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
  return Date.now();
}

export function startBlocksuiteOpenSession(params: {
  instanceId: string;
  workspaceId: string;
  docId: string;
  variant: "embedded" | "full";
}) {
  const owner = getPerfOwner();
  const startedAt = now();
  const session: BlocksuitePerfSession = {
    instanceId: params.instanceId,
    workspaceId: params.workspaceId,
    docId: params.docId,
    variant: params.variant,
    frameKind: "route",
    startedAt,
    marks: {
      "host-open-start": startedAt,
    },
  };
  owner.__tcBlocksuitePerfSessions!.set(params.instanceId, session);
}

export function markBlocksuiteOpenSession(instanceId: string, mark: BlocksuitePerfMarkName) {
  if (!instanceId)
    return;

  const owner = getPerfOwner();
  const session = owner.__tcBlocksuitePerfSessions?.get(instanceId);
  if (!session)
    return;

  session.marks[mark] = now();
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

  const bootstrapStart = session.marks["frame-bootstrap-start"];
  const bootstrapReady = session.marks["frame-bootstrap-ready"];
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
    ...(owner.__tcBlocksuitePerfHistory ?? []).slice(0, 19),
  ];
  owner.__tcBlocksuitePerfSessions?.delete(instanceId);

  if (import.meta.env.DEV) {
    console.warn("[BlocksuitePerf]", owner.__tcBlocksuitePerfLast);
  }

  return owner.__tcBlocksuitePerfLast;
}
