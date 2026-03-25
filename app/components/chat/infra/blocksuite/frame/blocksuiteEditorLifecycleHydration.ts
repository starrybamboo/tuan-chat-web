import { isNonRetryableBlocksuiteDocError } from "@/components/chat/infra/blocksuite/blocksuiteDocError";
import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/descriptionDocId";
import { getRemoteSnapshot } from "@/components/chat/infra/blocksuite/descriptionDocRemote";

export const INITIAL_REMOTE_HYDRATION_WAIT_MS = 1200;
export const LATE_REMOTE_HYDRATION_WAIT_MS = 4000;
const HYDRATION_POLL_INTERVAL_MS = 50;

export type InitialHydrationState = "not-applicable" | "completed" | "timed-out";

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
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function shouldUseRemoteFirstHydration(docId: string): boolean {
  return Boolean(parseDescriptionDocId(docId));
}

export function shouldEnsureTcHeaderFallback(params: {
  tcHeaderEnabled: boolean;
  hydrationState: InitialHydrationState;
}): boolean {
  if (!params.tcHeaderEnabled) {
    return false;
  }
  return params.hydrationState !== "timed-out";
}

export function shouldDelayRenderReady(hydrationState: InitialHydrationState): boolean {
  return hydrationState === "timed-out";
}

export async function warmDescriptionRemoteSnapshot(docId: string): Promise<void> {
  const key = parseDescriptionDocId(docId);
  if (!key) {
    return;
  }

  try {
    await getRemoteSnapshot(key);
  }
  catch (error) {
    if (!isNonRetryableBlocksuiteDocError(error)) {
      console.warn("[BlocksuiteDescriptionEditor] Failed to warm remote snapshot cache", error);
    }
  }
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
