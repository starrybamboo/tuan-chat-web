type DocCardShareEventName
  = | "share-requested"
    | "share-sync-skip"
    | "share-sync-start"
    | "share-sync-success"
    | "share-sync-failed"
    | "share-message-send-start"
    | "share-message-send-success"
    | "share-message-send-failed"
    | "preview-click"
    | "preview-disabled-click"
    | "preview-store-load-start"
    | "preview-store-load-success"
    | "preview-store-load-failed"
    | "preview-header-sync"
    | "remote-snapshot-get-start"
    | "remote-snapshot-get-success"
    | "remote-snapshot-get-failed"
    | "remote-snapshot-set-start"
    | "remote-snapshot-set-success"
    | "remote-snapshot-set-failed"
    | "hydration-decision";

export type DocCardShareObservation = {
  at: number;
  event: DocCardShareEventName;
  payload?: Record<string, unknown>;
};

type ObservabilityOwner = {
  __tcDocCardShareHistory?: DocCardShareObservation[];
  __tcDocCardShareLast?: DocCardShareObservation;
};

const DOC_CARD_SHARE_HISTORY_LIMIT = 200;

function getObservabilityOwner(): ObservabilityOwner {
  let owner: ObservabilityOwner = globalThis as unknown as ObservabilityOwner;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as unknown as ObservabilityOwner;
      }
    }
    catch {
      owner = window as unknown as ObservabilityOwner;
    }
  }

  owner.__tcDocCardShareHistory ??= [];
  return owner;
}

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.timeOrigin + performance.now();
  }
  return Date.now();
}

export function isDocCardShareDebugEnabled(): boolean {
  try {
    const g = globalThis as any;
    if (g?.__TC_DOC_CARD_SHARE_DEBUG === true) {
      return true;
    }
  }
  catch {
    // ignore
  }

  try {
    if (typeof localStorage === "undefined") {
      return false;
    }
    return localStorage.getItem("tc:doc-card-share:debug") === "1";
  }
  catch {
    return false;
  }
}

export function recordDocCardShareObservation(
  event: DocCardShareEventName,
  payload?: Record<string, unknown>,
) {
  const owner = getObservabilityOwner();
  const entry: DocCardShareObservation = {
    at: now(),
    event,
    ...(payload ? { payload } : {}),
  };

  owner.__tcDocCardShareLast = entry;
  owner.__tcDocCardShareHistory = [
    entry,
    ...(owner.__tcDocCardShareHistory ?? []).slice(0, DOC_CARD_SHARE_HISTORY_LIMIT - 1),
  ];

  if (isDocCardShareDebugEnabled()) {
    console.warn("[DocCardShareDebug]", event, payload ?? {});
  }

  return entry;
}

export function getDocCardShareObservationHistory(): DocCardShareObservation[] {
  return [...(getObservabilityOwner().__tcDocCardShareHistory ?? [])];
}
