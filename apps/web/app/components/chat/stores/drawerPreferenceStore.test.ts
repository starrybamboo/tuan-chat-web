import { afterEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private readonly storage = new Map<string, string>();

  getItem(key: string) {
    return this.storage.has(key) ? this.storage.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.storage.set(key, String(value));
  }
}

async function loadDrawerPreferenceStore(storage: MemoryStorage) {
  vi.resetModules();
  Object.defineProperty(globalThis, "window", {
    value: { localStorage: storage },
    configurable: true,
    writable: true,
  });
  return await import("./drawerPreferenceStore");
}

describe("drawerPreferenceStore", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    vi.resetModules();
  });

  it("旧 WebGAL 侧栏宽度会迁移为跑团侧窗宽度", async () => {
    const storage = new MemoryStorage();
    storage.setItem("webgalDrawerWidth", "720");
    const { useDrawerPreferenceStore } = await loadDrawerPreferenceStore(storage);

    useDrawerPreferenceStore.getState().hydrateFromLocalStorage();

    expect(useDrawerPreferenceStore.getState().subRoomWindowWidth).toBe(720);
  });

  it("已有跑团侧窗宽度优先于旧 WebGAL 宽度", async () => {
    const storage = new MemoryStorage();
    storage.setItem("webgalDrawerWidth", "720");
    storage.setItem("subRoomWindowWidth", "640");
    const { useDrawerPreferenceStore } = await loadDrawerPreferenceStore(storage);

    useDrawerPreferenceStore.getState().hydrateFromLocalStorage();

    expect(useDrawerPreferenceStore.getState().subRoomWindowWidth).toBe(640);
  });
});
