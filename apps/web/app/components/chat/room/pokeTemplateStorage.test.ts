import { getPokeTemplateStorageKey } from "@tuanchat/domain/poke-message";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readPokeTemplate, writePokeTemplate } from "./pokeTemplateStorage";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("pokeTemplateStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: new MemoryStorage(),
    });
  });

  it("按登录用户和目标角色隔离模板", () => {
    writePokeTemplate(7, 11, "用户 7 的模板");
    writePokeTemplate(8, 11, "用户 8 的模板");

    expect(readPokeTemplate(7, 11)).toBe("用户 7 的模板");
    expect(readPokeTemplate(8, 11)).toBe("用户 8 的模板");
    expect(window.localStorage.getItem(getPokeTemplateStorageKey(7, 11))).toBe("用户 7 的模板");
  });

  it("无效用户或目标角色不读写缓存", () => {
    writePokeTemplate(0, 11, "无效");
    writePokeTemplate(7, 0, "无效");

    expect(readPokeTemplate(0, 11)).toBeNull();
    expect(readPokeTemplate(7, 0)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });
});
