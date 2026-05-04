import { parseDescriptionDocId } from "@/components/chat/infra/blocksuite/description/descriptionDocId";

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
    timeoutMs = LATE_REMOTE_HYDRATION_WAIT_MS,
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
