/** 与 SQLite SAH pool 生命周期绑定的跨标签页 Web Lock 名称。 */
export const CHAT_LOCAL_DB_WEB_LOCK_NAME = "tuanchat:chat-local-db:opfs-sahpool";

/** 通知当前持有者交接 SQLite 所有权的同源广播频道。 */
export const CHAT_LOCAL_DB_OWNERSHIP_CHANNEL_NAME = "tuanchat:chat-local-db:ownership";

type OwnershipRequestMessage = {
  type: "request-ownership";
};

/** 隔离 BroadcastChannel 平台行为的所有权请求传输边界。 */
export type OwnershipRequestTransport = {
  close: () => void;
  publish: (message: unknown) => void;
  subscribe: (listener: (message: unknown) => void) => () => void;
};

/** 请求驱动的跨标签页 SQLite 所有权协调器。 */
export type LocalDbOwnershipCoordinator = {
  dispose: () => void;
  requestOwnership: () => void;
};

/** 可注入测试替身的 Web Locks 请求边界。 */
export type ExclusiveLockRequest = (
  name: string,
  options: { mode: "exclusive"; signal?: AbortSignal },
  callback: (lock: object | null) => Promise<void>,
) => Promise<unknown>;

/** 持有排他锁期间由调用方控制释放时机的租约。 */
export type ExclusiveWebLockLease = {
  release: () => Promise<void>;
};

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function isOwnershipRequestMessage(message: unknown): message is OwnershipRequestMessage {
  return typeof message === "object"
    && message !== null
    && "type" in message
    && message.type === "request-ownership";
}

/** 仅在收到其他页面的明确请求时通知当前持有者释放所有权。 */
export function createLocalDbOwnershipCoordinator(
  transport: OwnershipRequestTransport,
  onOwnershipRequested: () => void,
): LocalDbOwnershipCoordinator {
  let isDisposed = false;
  const unsubscribe = transport.subscribe((message) => {
    if (!isDisposed && isOwnershipRequestMessage(message)) {
      onOwnershipRequested();
    }
  });

  return {
    dispose() {
      if (isDisposed) {
        return;
      }
      isDisposed = true;
      unsubscribe();
      transport.close();
    },
    requestOwnership() {
      if (!isDisposed) {
        transport.publish({ type: "request-ownership" } satisfies OwnershipRequestMessage);
      }
    },
  };
}

/** 等待并持有跨标签页排他锁，直到调用方显式释放租约。 */
export async function acquireExclusiveWebLock(
  requestLock: ExclusiveLockRequest,
  name: string,
  signal?: AbortSignal,
): Promise<ExclusiveWebLockLease> {
  const acquired = createDeferred<void>();
  const hold = createDeferred<void>();

  const requestPromise = requestLock(name, { mode: "exclusive", signal }, async (lock) => {
    if (!lock) {
      acquired.reject(new Error(`Web Lock "${name}" was not granted.`));
      return;
    }
    acquired.resolve();
    await hold.promise;
  });
  void requestPromise.catch((error: unknown) => {
    acquired.reject(error);
  });

  await acquired.promise;
  let releasePromise: Promise<void> | null = null;

  return {
    release: () => {
      if (!releasePromise) {
        hold.resolve();
        releasePromise = requestPromise.then(() => undefined);
      }
      return releasePromise;
    },
  };
}
