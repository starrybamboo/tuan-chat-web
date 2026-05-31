import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCloudflareWebAnalyticsController,
  shouldEnableCloudflareWebAnalytics,
} from "./cloudflareWebAnalytics";

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
    appendChild: (node: FakeScript) => {
      node.isConnected = true;
      this.scripts.push(node);
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
  protocol?: string;
  timeoutMs?: number;
} = {}) {
  const runtimeDocument = new FakeDocument();
  const controller = createCloudflareWebAnalyticsController({
    isProd: options.isProd ?? true,
    timeoutMs: options.timeoutMs ?? 50,
    getDocument: () => runtimeDocument,
    getWindow: () => ({
      location: {
        hostname: options.hostname ?? "test.tuan.chat",
        protocol: options.protocol ?? "https:",
      },
    }),
    setTimeoutFn: setTimeout,
  });

  return {
    controller,
    runtimeDocument,
  };
}

describe("shouldEnableCloudflareWebAnalytics", () => {
  it("会在 https 的 tuan.chat 托管域名启用 beacon", () => {
    expect(shouldEnableCloudflareWebAnalytics({
      hostname: "test.tuan.chat",
      isProd: true,
      protocol: "https:",
    })).toBe(true);
  });

  it("会在本地开发地址禁用 beacon", () => {
    expect(shouldEnableCloudflareWebAnalytics({
      hostname: "localhost",
      isProd: true,
      protocol: "http:",
    })).toBe(false);
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

    expect(script?.getAttribute("data-cf-beacon")).toContain("bd3746d5fcac46db97172d382492de26");

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
