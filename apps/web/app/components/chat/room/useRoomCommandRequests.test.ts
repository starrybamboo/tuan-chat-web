import { vi } from "vitest";

import useRoomCommandRequests from "./useRoomCommandRequests";

const mocks = vi.hoisted(() => ({
  toastErrorMock: vi.fn<(...args: any[]) => any>(),
  isCommandMock: vi.fn<(...args: any[]) => any>(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    default: actual,
    useCallback: <T extends (...args: any[]) => any>(fn: T) => fn,
    useEffect: (fn: () => void | (() => void)) => fn(),
    useMemo: <T>(fn: () => T) => fn(),
    useRef: <T>(value: T) => ({ current: value }),
    useState: <T>(value: T | (() => T)) => [typeof value === "function" ? (value as () => T)() : value, vi.fn<(...args: any[]) => any>()] as const,
  };
});

vi.mock("@/components/common/appToast/appToast", () => ({
  appToast: {
    error: mocks.toastErrorMock,
  },
}));

vi.mock("@/components/common/dicer/cmdPre", () => ({
  isCommand: mocks.isCommandMock,
}));

class MemoryStorage {
  private readonly storage = new Map<string, string>();

  clear() {
    this.storage.clear();
  }

  getItem(key: string) {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.storage.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.storage.delete(key);
  }

  setItem(key: string, value: string) {
    this.storage.set(key, String(value));
  }

  get length() {
    return this.storage.size;
  }
}

const COMMAND_REQUEST_ONCE_STORAGE_KEY = "tc:command-request-once:v1";

describe("useRoomCommandRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCommandMock.mockReturnValue(false);
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: new MemoryStorage(),
      },
      configurable: true,
      writable: true,
    });
  });

  it("首次执行检定请求成功后会写入本地一次性记录", async () => {
    const commandExecutor = vi.fn<(...args: any[]) => any>(async () => true);
    const hook = useRoomCommandRequests({
      roomId: 7,
      userId: 11,
      isSpaceOwner: false,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      commandExecutor,
    });

    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });
    await Promise.resolve();

    expect(commandExecutor).toHaveBeenCalledWith({
      command: ".ra 侦查",
      originMessage: ".ra 侦查",
      replyMessageId: 101,
    });
    expect(hook.isCommandRequestConsumed(101)).toBe(true);

    const persisted = JSON.parse(window.localStorage.getItem(COMMAND_REQUEST_ONCE_STORAGE_KEY) ?? "{}");
    expect(persisted).toEqual({
      11: ["7:101"],
    });
  });

  it("检定请求执行失败时不会写入本地一次性记录，允许后续重试", async () => {
    const commandExecutor = vi.fn<(...args: any[]) => any>(async () => false);
    const hook = useRoomCommandRequests({
      roomId: 7,
      userId: 11,
      isSpaceOwner: false,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      commandExecutor,
    });

    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });
    await Promise.resolve();

    expect(hook.isCommandRequestConsumed(101)).toBe(false);
    expect(window.localStorage.getItem(COMMAND_REQUEST_ONCE_STORAGE_KEY)).toBeNull();
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("检定请求未执行成功，请重试");

    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });

    expect(commandExecutor).toHaveBeenCalledTimes(2);
  });

  it("检定请求执行中再次点击会被临时锁拦截但不会写入已执行", () => {
    let resolveExecution: ((value: boolean) => void) | undefined;
    const commandExecutor = vi.fn<(...args: any[]) => any>(() => new Promise<boolean>((resolve) => {
      resolveExecution = resolve;
    }));
    const hook = useRoomCommandRequests({
      roomId: 7,
      userId: 11,
      isSpaceOwner: false,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      commandExecutor,
    });

    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });
    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });

    expect(commandExecutor).toHaveBeenCalledTimes(1);
    expect(hook.isCommandRequestConsumed(101)).toBe(false);
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("检定请求正在执行，请稍后");

    resolveExecution?.(true);
  });

  it("同一条检定请求再次执行时会被本地一次性保护拦截", () => {
    window.localStorage.setItem(COMMAND_REQUEST_ONCE_STORAGE_KEY, JSON.stringify({
      11: ["7:101"],
    }));

    const commandExecutor = vi.fn<(...args: any[]) => any>(async () => {});
    const hook = useRoomCommandRequests({
      roomId: 7,
      userId: 11,
      isSpaceOwner: false,
      notMember: false,
      noRole: false,
      isSubmitting: false,
      commandExecutor,
    });

    expect(hook.isCommandRequestConsumed(101)).toBe(true);

    hook.handleExecuteCommandRequest({
      command: ".ra 侦查",
      requestMessageId: 101,
    });

    expect(commandExecutor).not.toHaveBeenCalled();
    expect(mocks.toastErrorMock).toHaveBeenCalledWith("该检定请求已执行");
  });
});
