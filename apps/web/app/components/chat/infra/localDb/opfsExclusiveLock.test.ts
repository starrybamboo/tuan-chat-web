import { describe, expect, it, vi } from "vitest";

import type { ExclusiveLockRequest, OwnershipRequestTransport } from "./opfsExclusiveLock";

import { acquireExclusiveWebLock, createLocalDbOwnershipCoordinator } from "./opfsExclusiveLock";

class FakeOwnershipRequestBus {
  private nextId = 1;
  private readonly listeners = new Map<number, (message: unknown) => void>();

  createTransport(): OwnershipRequestTransport {
    const id = this.nextId++;
    return {
      close: () => {
        this.listeners.delete(id);
      },
      publish: (message) => {
        for (const [listenerId, listener] of this.listeners) {
          if (listenerId !== id) {
            listener(message);
          }
        }
      },
      subscribe: (listener) => {
        this.listeners.set(id, listener);
        return () => {
          this.listeners.delete(id);
        };
      },
    };
  }
}

function createExclusiveLockCoordinator(): ExclusiveLockRequest {
  const waiting: Array<{
    run: () => Promise<void>;
    signal?: AbortSignal;
  }> = [];
  let active = false;

  const startNext = () => {
    if (active) {
      return;
    }
    const entry = waiting.shift();
    if (!entry) {
      return;
    }
    if (entry.signal?.aborted) {
      startNext();
      return;
    }
    active = true;
    void entry.run().finally(() => {
      active = false;
      startNext();
    });
  };

  return (_name, options, callback) => new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      const waitingIndex = waiting.findIndex(entry => entry.run === run);
      if (waitingIndex >= 0) {
        waiting.splice(waitingIndex, 1);
      }
      reject(options.signal?.reason);
    };
    const run = async () => {
      options.signal?.removeEventListener("abort", handleAbort);
      await callback({});
    };
    if (options.signal?.aborted) {
      reject(options.signal.reason);
      return;
    }
    options.signal?.addEventListener("abort", handleAbort, { once: true });
    waiting.push({
      run: async () => {
        try {
          await run();
          resolve();
        }
        catch (error) {
          reject(error);
        }
      },
      signal: options.signal,
    });
    startNext();
  });
}

describe("acquireExclusiveWebLock", () => {
  it("前一个页面释放后把锁交给排队中的第二个页面", async () => {
    const requestLock = createExclusiveLockCoordinator();
    const firstLease = await acquireExclusiveWebLock(requestLock, "chat-db");
    let secondAcquired = false;
    const secondLeasePromise = acquireExclusiveWebLock(requestLock, "chat-db").then((lease) => {
      secondAcquired = true;
      return lease;
    });

    await Promise.resolve();
    expect(secondAcquired).toBe(false);

    await firstLease.release();
    const secondLease = await secondLeasePromise;
    expect(secondAcquired).toBe(true);

    await secondLease.release();
  });

  it("等待锁时可以通过 AbortSignal 取消排队", async () => {
    const requestLock = createExclusiveLockCoordinator();
    const firstLease = await acquireExclusiveWebLock(requestLock, "chat-db");
    const abortController = new AbortController();
    const waitingLease = acquireExclusiveWebLock(requestLock, "chat-db", abortController.signal);

    abortController.abort();

    await expect(waitingLease).rejects.toMatchObject({ name: "AbortError" });
    await firstLease.release();
  });

  it("重复释放同一租约时复用同一个完成结果", async () => {
    const requestLock = createExclusiveLockCoordinator();
    const lease = await acquireExclusiveWebLock(requestLock, "chat-db");

    const firstRelease = lease.release();
    const secondRelease = lease.release();

    expect(secondRelease).toBe(firstRelease);
    await firstRelease;
  });
});

describe("createLocalDbOwnershipCoordinator", () => {
  it("没有竞争者请求时不通知当前持有者释放", () => {
    const bus = new FakeOwnershipRequestBus();
    const handleFirstRequest = vi.fn();
    const handleSecondRequest = vi.fn();
    const first = createLocalDbOwnershipCoordinator(bus.createTransport(), handleFirstRequest);
    const second = createLocalDbOwnershipCoordinator(bus.createTransport(), handleSecondRequest);

    expect(handleFirstRequest).not.toHaveBeenCalled();
    expect(handleSecondRequest).not.toHaveBeenCalled();

    first.dispose();
    second.dispose();
  });

  it("竞争者明确请求时只通知其他页面的持有者", () => {
    const bus = new FakeOwnershipRequestBus();
    const handleOwnerRequest = vi.fn();
    const handleRequesterRequest = vi.fn();
    const owner = createLocalDbOwnershipCoordinator(bus.createTransport(), handleOwnerRequest);
    const requester = createLocalDbOwnershipCoordinator(bus.createTransport(), handleRequesterRequest);

    requester.requestOwnership();

    expect(handleOwnerRequest).toHaveBeenCalledTimes(1);
    expect(handleRequesterRequest).not.toHaveBeenCalled();

    owner.dispose();
    requester.dispose();
  });

  it("页面销毁后停止响应后续所有权请求", () => {
    const bus = new FakeOwnershipRequestBus();
    const handleOwnerRequest = vi.fn();
    const owner = createLocalDbOwnershipCoordinator(bus.createTransport(), handleOwnerRequest);
    const requester = createLocalDbOwnershipCoordinator(bus.createTransport(), vi.fn());

    owner.dispose();
    requester.requestOwnership();

    expect(handleOwnerRequest).not.toHaveBeenCalled();
    requester.dispose();
  });
});
