import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBlocksuiteFrameMessage } from "../shared/frameProtocol";
import {
  ensurePrewarmedBlocksuiteFrame,
  resetBlocksuiteWarmFrameForTests,
  takePrewarmedBlocksuiteFrame,
} from "../shared/warmFrame";

class FakeElement extends EventTarget {
  allow = "";
  allowFullscreen = false;
  childElementCount = 0;
  children: FakeElement[] = [];
  className = "";
  dataset: Record<string, string> = {};
  isConnected = false;
  parentElement: FakeElement | null = null;
  src = "";
  style: Record<string, string> = {};
  tagName: string;
  title = "";

  constructor(tagName: string) {
    super();
    this.tagName = tagName.toUpperCase();
  }

  append(child: FakeElement) {
    if (child.parentElement) {
      child.remove();
    }
    this.children.push(child);
    this.childElementCount = this.children.length;
    child.parentElement = this;
    child.setConnected(this.isConnected);
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(item => item !== this);
      this.parentElement.childElementCount = this.parentElement.children.length;
      this.parentElement = null;
    }
    this.setConnected(false);
  }

  setConnected(next: boolean) {
    this.isConnected = next;
    for (const child of this.children) {
      child.setConnected(next);
    }
  }
}

class FakeIframeElement extends FakeElement {
  contentWindow: MessageEventSource;

  constructor() {
    super("iframe");
    this.contentWindow = {
      postMessage: vi.fn(),
    } as unknown as MessageEventSource;
  }
}

class FakeDocument {
  body = new FakeElement("body");
  iframes: FakeIframeElement[] = [];

  constructor() {
    this.body.setConnected(true);
  }

  createElement(tagName: string) {
    if (tagName === "iframe") {
      const iframe = new FakeIframeElement();
      this.iframes.push(iframe);
      return iframe as unknown as HTMLIFrameElement;
    }
    return new FakeElement(tagName) as unknown as HTMLDivElement;
  }
}

class FakeWindow extends EventTarget {
  clearTimeout = ((handle: number) => globalThis.clearTimeout(handle)) as typeof globalThis.clearTimeout;
  location = { origin: "https://tuanchat.test" } as Location;
  setTimeout = ((handler: TimerHandler, timeout?: number) => globalThis.setTimeout(handler, timeout)) as typeof globalThis.setTimeout;
  top: Window & typeof globalThis;

  constructor() {
    super();
    this.top = this as unknown as Window & typeof globalThis;
  }
}

describe("blocksuiteWarmFrame", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  let fakeWindow: FakeWindow;
  let fakeDocument: FakeDocument;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeWindow = new FakeWindow();
    fakeDocument = new FakeDocument();
    globalThis.window = fakeWindow as unknown as Window & typeof globalThis;
    globalThis.document = fakeDocument as unknown as Document;
  });

  afterEach(() => {
    resetBlocksuiteWarmFrameForTests();
    vi.useRealTimers();
    vi.clearAllMocks();

    if (originalWindow) {
      globalThis.window = originalWindow;
    }
    else {
      delete (globalThis as { window?: Window & typeof globalThis }).window;
    }

    if (originalDocument) {
      globalThis.document = originalDocument;
    }
    else {
      delete (globalThis as { document?: Document }).document;
    }
  });

  it("预热失败时返回 false，且不会留下可认领的 iframe", async () => {
    const readyPromise = ensurePrewarmedBlocksuiteFrame();
    const iframe = fakeDocument.iframes[0];

    expect(iframe).toBeDefined();
    expect(takePrewarmedBlocksuiteFrame()).toBeNull();

    iframe.dispatchEvent(new Event("error"));

    await expect(readyPromise).resolves.toBe(false);
    expect(takePrewarmedBlocksuiteFrame()).toBeNull();
    expect(fakeDocument.body.childElementCount).toBe(0);
  });

  it("只会认领已经 render-ready 的 warm frame", async () => {
    const readyPromise = ensurePrewarmedBlocksuiteFrame();
    const iframe = fakeDocument.iframes[0];

    expect(iframe).toBeDefined();
    expect(takePrewarmedBlocksuiteFrame()).toBeNull();

    const messageEvent = new MessageEvent("message", {
      origin: fakeWindow.location.origin,
      data: createBlocksuiteFrameMessage(undefined, { type: "render-ready" }),
    });
    Object.defineProperty(messageEvent, "source", {
      value: iframe.contentWindow,
      configurable: true,
    });
    fakeWindow.dispatchEvent(messageEvent);

    await expect(readyPromise).resolves.toBe(true);
    expect(takePrewarmedBlocksuiteFrame()).toBe(iframe);
    expect(takePrewarmedBlocksuiteFrame()).toBeNull();
  });
});
