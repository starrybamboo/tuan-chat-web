import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCloudflareWebAnalyticsController,
  resolveCloudflareWebAnalyticsConfig,
  shouldEnableCloudflareWebAnalytics,
} from "./cloudflareWebAnalytics";

function createAnalyticsConfig(mode: "production" | "test") {
  return mode === "production"
    ? {
        environment: "production" as const,
        hosts: new Set(["tuan.chat", "www.tuan.chat"]),
        token: "ecffe13cc26a481880812c11e3489111",
      }
    : {
        environment: "test" as const,
        hosts: new Set(["test.tuan.chat", "www.test.tuan.chat"]),
        token: "bd9e06f17e3b4f19bd7d6def90fdc7e5",
      };
}

class FakeScript {
  id = "";
  src = "";
  defer = false;
  isConnected = false;
  dataset: Record<string, string | undefined> = {};

  private readonly attrs = new Map<string, string>();
  private readonly listeners = new Map<"load" | "error", Array<{ listener: EventListener; once: boolean }>>();

  addEventListener(
    type: "load" | "error",
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
  ) {
    const once = typeof options === "object" ? options.once === true : false;
    const current = this.listeners.get(type) ?? [];
    current.push({ listener, once });
    this.listeners.set(type, current);
  }

  dispatch(type: "load" | "error") {
    const current = [...(this.listeners.get(type) ?? [])];
    for (const entry of current) {
      entry.listener({ type } as Event);
    }
    this.listeners.set(
      type,
      current.filter(entry => !entry.once),
    );
  }

  getAttribute(name: string) {
    return this.attrs.get(name) ?? null;
  }

  setAttribute(name: string, value: string) {
    this.attrs.set(name, value);
  }
}

class FakeDocument {
  readonly baseURI = "https://test.tuan.chat/chat";
  readonly scripts: FakeScript[] = [];
  readonly head = {
    appendChild: (node: { isConnected?: boolean }) => {
      node.isConnected = true;
      this.scripts.push(node as FakeScript);
    },
  };

  createElement(tag: string) {
    if (tag !== "script") {
      throw new Error(`Unexpected tag: ${tag}`);
    }
    return new FakeScript();
  }

  getElementById(id: string) {
    return this.scripts.find(script => script.id === id) ?? null;
  }

  querySelectorAll(_selectors: string) {
    return this.scripts;
  }
}

function createController(options: {
  hostname?: string;
  isProd?: boolean;
  mode?: string;
  protocol?: string;
  setTimeoutFn?: (handler: () => void, timeoutMs: number) => ReturnType<typeof setTimeout>;
  timeoutMs?: number;
} = {}) {
  const runtimeDocument = new FakeDocument();
  const controller = createCloudflareWebAnalyticsController({
    isProd: options.isProd ?? true,
    analyticsConfig: createAnalyticsConfig(options.mode === "production" ? "production" : "test"),
    timeoutMs: options.timeoutMs ?? 50,
    getDocument: () => runtimeDocument,
    getWindow: () => ({
      location: {
        hostname: options.hostname ?? "test.tuan.chat",
        protocol: options.protocol ?? "https:",
      },
    }),
    setTimeoutFn: options.setTimeoutFn ?? ((handler, timeoutMs) => setTimeout(handler, timeoutMs)),
  });

  return {
    controller,
    runtimeDocument,
  };
}

describe("shouldEnableCloudflareWebAnalytics", () => {
  it("会在 https 的 tuan.chat 托管域名启用 beacon", () => {
    expect(shouldEnableCloudflareWebAnalytics({
      analyticsConfig: createAnalyticsConfig("test"),
      hostname: "test.tuan.chat",
      isProd: true,
      protocol: "https:",
    })).toBe(true);
  });

  it("会在本地开发地址禁用 beacon", () => {
    expect(shouldEnableCloudflareWebAnalytics({
      analyticsConfig: createAnalyticsConfig("test"),
      hostname: "localhost",
      isProd: true,
      protocol: "http:",
    })).toBe(false);
  });

  it("会在构建 mode 与托管域名不匹配时禁用 beacon", () => {
    expect(shouldEnableCloudflareWebAnalytics({
      analyticsConfig: createAnalyticsConfig("production"),
      hostname: "test.tuan.chat",
      isProd: true,
      protocol: "https:",
    })).toBe(false);
  });
});

describe("resolveCloudflareWebAnalyticsConfig", () => {
  it("会为正式域名选择生产 Web Analytics token", () => {
    expect(resolveCloudflareWebAnalyticsConfig({
      analyticsConfig: createAnalyticsConfig("production"),
      hostname: "tuan.chat",
      isProd: true,
      protocol: "https:",
    })).toEqual({
      environment: "production",
      token: "ecffe13cc26a481880812c11e3489111",
    });
  });

  it("会为测试域名选择测试 Web Analytics token", () => {
    expect(resolveCloudflareWebAnalyticsConfig({
      analyticsConfig: createAnalyticsConfig("test"),
      hostname: "test.tuan.chat",
      isProd: true,
      protocol: "https:",
    })).toEqual({
      environment: "test",
      token: "bd9e06f17e3b4f19bd7d6def90fdc7e5",
    });
  });
});

describe("createCloudflareWebAnalyticsController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("会在脚本成功加载后标记为 loaded", async () => {
    const { controller, runtimeDocument } = createController();

    const loadingPromise = controller.ensureLoaded();
    const script = runtimeDocument.scripts[0];

    expect(script?.getAttribute("data-cfasync")).toBe("false");
    expect(script?.getAttribute("data-cf-beacon")).toBe(JSON.stringify({
      token: "bd9e06f17e3b4f19bd7d6def90fdc7e5",
      spa: true,
    }));

    script.dispatch("load");

    await expect(loadingPromise).resolves.toBe("loaded");
    expect(controller.getStatus()).toBe("loaded");
  });

  it("会在脚本长时间未返回时判定为 blocked", async () => {
    vi.useFakeTimers();
    const { controller } = createController({ timeoutMs: 80 });

    const loadingPromise = controller.ensureLoaded();

    expect(controller.getStatus()).toBe("loading");

    await vi.advanceTimersByTimeAsync(81);

    await expect(loadingPromise).resolves.toBe("blocked");
    expect(controller.getStatus()).toBe("blocked");
  });

  it("调度超时检测时不会依赖 window.setTimeout 的 this 绑定", async () => {
    const { controller, runtimeDocument } = createController({
      setTimeoutFn(handler, timeoutMs) {
        expect(this).toBeUndefined();
        return setTimeout(handler, timeoutMs);
      },
    });

    const loadingPromise = controller.ensureLoaded();

    runtimeDocument.scripts[0].dispatch("load");

    await expect(loadingPromise).resolves.toBe("loaded");
  });

  it("会在非线上运行时直接禁用 beacon", async () => {
    const { controller, runtimeDocument } = createController({
      hostname: "localhost",
      protocol: "http:",
    });

    await expect(controller.ensureLoaded()).resolves.toBe("disabled");
    expect(controller.getStatus()).toBe("disabled");
    expect(runtimeDocument.scripts).toHaveLength(0);
  });
});
