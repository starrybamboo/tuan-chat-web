import { getPokeTemplateStorageKey } from "@tuanchat/domain/poke-message";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readMobilePokeTemplate,
  writeMobilePokeTemplate,
} from "./mobilePokeTemplateStorage";

const keyValueStorageMock = vi.hoisted(() => ({
  readMobileKeyValue: vi.fn(),
  writeMobileKeyValue: vi.fn(),
}));

vi.mock("../../lib/mobile-key-value-storage", () => keyValueStorageMock);

beforeEach(() => {
  keyValueStorageMock.readMobileKeyValue.mockReset();
  keyValueStorageMock.writeMobileKeyValue.mockReset();
});

describe("mobilePokeTemplateStorage", () => {
  it("按登录用户和目标角色读取本地模板", async () => {
    keyValueStorageMock.readMobileKeyValue.mockResolvedValue({
      value: "自定义戳一戳正文",
    });

    await expect(readMobilePokeTemplate(3, 9)).resolves.toBe("自定义戳一戳正文");
    expect(keyValueStorageMock.readMobileKeyValue).toHaveBeenCalledWith(
      getPokeTemplateStorageKey(3, 9),
    );
  });

  it("成功发送后使用同一缓存键写入最终正文", async () => {
    await writeMobilePokeTemplate(3, 9, "最终正文");

    expect(keyValueStorageMock.writeMobileKeyValue).toHaveBeenCalledWith(
      getPokeTemplateStorageKey(3, 9),
      "最终正文",
    );
  });

  it("用户或目标角色无效时跳过持久化访问", async () => {
    await expect(readMobilePokeTemplate(0, 9)).resolves.toBeNull();
    await expect(readMobilePokeTemplate(3, 0)).resolves.toBeNull();
    await writeMobilePokeTemplate(0, 9, "正文");
    await writeMobilePokeTemplate(3, 0, "正文");

    expect(keyValueStorageMock.readMobileKeyValue).not.toHaveBeenCalled();
    expect(keyValueStorageMock.writeMobileKeyValue).not.toHaveBeenCalled();
  });
});
