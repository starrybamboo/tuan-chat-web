import { loadBlocksuiteRuntimeStyleText, ensureBlocksuiteRuntimeStyles } from "../styles/ensureBlocksuiteRuntimeStyles";
import { ensureBlocksuiteCoreElementsDefined, loadBlocksuiteCoreModules } from "../spec/coreElements";
import { prewarmBlocksuiteRuntimeModules } from "../runtime/runtimeLoader";

const READY_PROMISE_KEY = "__tcBlocksuiteRuntimeReadyPromise";
const PREWARM_PROMISE_KEY = "__tcBlocksuiteRuntimePrewarmPromise";

type RuntimeOwner = Record<string, Promise<void> | undefined>;

function getRuntimeOwner(): RuntimeOwner {
  let owner: RuntimeOwner = globalThis as unknown as RuntimeOwner;

  if (typeof window !== "undefined") {
    try {
      const top = window.top;
      if (top && top.location?.origin === window.location.origin) {
        owner = top as unknown as RuntimeOwner;
      }
    }
    catch {
      owner = window as unknown as RuntimeOwner;
    }
  }

  return owner;
}

export async function prewarmBlocksuiteRuntime(): Promise<void> {
  if (typeof window === "undefined")
    return;

  const owner = getRuntimeOwner();
  if (owner[PREWARM_PROMISE_KEY]) {
    return owner[PREWARM_PROMISE_KEY];
  }

  owner[PREWARM_PROMISE_KEY] = Promise.all([
    loadBlocksuiteRuntimeStyleText(),
    loadBlocksuiteCoreModules(),
    prewarmBlocksuiteRuntimeModules(),
  ]).then(() => undefined);

  return owner[PREWARM_PROMISE_KEY];
}

export async function ensureBlocksuiteRuntimeReady(targetDocument: Document = document): Promise<void> {
  if (typeof window === "undefined")
    return;

  const owner = targetDocument.defaultView as RuntimeOwner | null ?? (globalThis as unknown as RuntimeOwner);
  if (owner[READY_PROMISE_KEY]) {
    return owner[READY_PROMISE_KEY];
  }

  owner[READY_PROMISE_KEY] = (async () => {
    const [_, coreModules] = await Promise.all([
      prewarmBlocksuiteRuntime(),
      loadBlocksuiteCoreModules(),
    ]);

    await ensureBlocksuiteRuntimeStyles(targetDocument);
    await ensureBlocksuiteCoreElementsDefined(coreModules);
  })().catch((error) => {
    delete owner[READY_PROMISE_KEY];
    throw error;
  });

  return owner[READY_PROMISE_KEY];
}
