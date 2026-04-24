import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/description/descriptionDocRemote";
import { base64ToUint8Array } from "@/components/chat/infra/blocksuite/shared/base64";
import { isNonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/shared/blocksuiteDocError";
import { recordDocCardShareObservation } from "@/components/chat/infra/blocksuite/shared/docCardShareObservability";

const INITIAL_REMOTE_HYDRATION_WAIT_MS = 1200;
export const LATE_REMOTE_HYDRATION_WAIT_MS = 4000;
const HYDRATION_POLL_INTERVAL_MS = 50;

export type InitialHydrationState = "not-applicable" | "completed" | "timed-out";
export type RemoteSnapshotState = "not-applicable" | "snapshot-hit" | "empty" | "error" | "timed-out";
export type RemoteSnapshotDecision = {
  state: RemoteSnapshotState;
  update: Uint8Array | null;
};

type WorkspaceLike = {
  getDoc?: (docId: string) => unknown;
};

function isRemoteHydrationCompleted(workspace: WorkspaceLike, docId: string): boolean {
  const doc = workspace.getDoc?.(docId) as { _remoteHydrationCompleted?: boolean } | null | undefined;
  return doc?._remoteHydrationCompleted === true;
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onAbort() {
      if (timer) {
        clearTimeout(timer);
      }
      signal.removeEventListener("abort", onAbort);
      resolve();
    }

    timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function shouldUseRemoteFirstHydration(docId: string): boolean {
  return Boolean(parseDescriptionDocId(docId));
}

export function shouldEnsureTcHeaderFallback(params: {
  tcHeaderEnabled: boolean;
  hydrationState: RemoteSnapshotState;
}): boolean {
  if (!params.tcHeaderEnabled) {
    return false;
  }
  return params.hydrationState === "not-applicable"
    || params.hydrationState === "snapshot-hit"
    || params.hydrationState === "empty";
}

export async function fetchDescriptionRemoteSnapshotUpdate(docId: string): Promise<Uint8Array | null> {
  const key = parseDescriptionDocId(docId);
  if (!key) {
    return null;
  }

  const remote = await getRemoteSnapshot(key);
  if (!remote?.updateB64) {
    return null;
  }
  return base64ToUint8Array(remote.updateB64);
}

export async function waitForRemoteSnapshotDecision(params: {
  docId: string;
  signal: AbortSignal;
  timeoutMs?: number;
}): Promise<RemoteSnapshotDecision> {
  const { docId, signal, timeoutMs = INITIAL_REMOTE_HYDRATION_WAIT_MS } = params;

  if (!shouldUseRemoteFirstHydration(docId)) {
    return { state: "not-applicable", update: null };
  }

  const result = await Promise.race([
    fetchDescriptionRemoteSnapshotUpdate(docId).then(update => ({
      state: update?.length ? "snapshot-hit" as const : "empty" as const,
      update,
    })).catch((error) => {
      if (!isNonRetryableBlocksuiteDocError(error)) {
        console.warn("[BlocksuiteDescriptionEditor] Failed to decide startup remote snapshot", error);
      }
      return {
        state: "error" as const,
        update: null,
      };
    }),
    delay(timeoutMs, signal).then(() => ({
      state: "timed-out" as const,
      update: null,
    })),
  ]);
  recordDocCardShareObservation("hydration-decision", {
    docId,
    state: result.state,
    timeoutMs,
    hasUpdate: Boolean(result.update?.length),
    updateBytes: result.update?.length ?? 0,
  });
  return result;
}

export async function waitForRemoteHydrationSettled(params: {
  workspace: WorkspaceLike;
  docId: string;
  signal: AbortSignal;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<InitialHydrationState> {
  const {
    workspace,
    docId,
    signal,
    timeoutMs = INITIAL_REMOTE_HYDRATION_WAIT_MS,
    pollIntervalMs = HYDRATION_POLL_INTERVAL_MS,
  } = params;

  if (!shouldUseRemoteFirstHydration(docId)) {
    return "not-applicable";
  }

  const deadline = Date.now() + Math.max(0, timeoutMs);
  while (!signal.aborted) {
    if (isRemoteHydrationCompleted(workspace, docId)) {
      return "completed";
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return "timed-out";
    }

    await delay(Math.min(pollIntervalMs, remaining), signal);
  }

  return "timed-out";
}
