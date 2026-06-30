import { beforeEach, describe, expect, it, vi } from "vitest";

import { hasDisabledBackgroundPushReminder, markBackgroundPushReminderDisabled } from "./backgroundPushOnboardingStorage";

const keyValueStorageMock = vi.hoisted(() => ({
  readMobileKeyValue: vi.fn(),
  writeMobileKeyValue: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: {
    OS: "android",
  },
}));

vi.mock("../../lib/mobile-key-value-storage", () => keyValueStorageMock);

beforeEach(() => {
  keyValueStorageMock.readMobileKeyValue.mockReset();
  keyValueStorageMock.writeMobileKeyValue.mockReset();
});

describe("backgroundPushOnboardingStorage", () => {
  it("会从移动端 KV 读取后台推送不再提醒状态", async () => {
    keyValueStorageMock.readMobileKeyValue.mockResolvedValue({ value: true });

    await expect(hasDisabledBackgroundPushReminder()).resolves.toBe(true);

    expect(keyValueStorageMock.readMobileKeyValue).toHaveBeenCalledWith("tuanchat.mobile.background-push-reminder.v1");
  });

  it("会把后台推送提醒标记为不再提醒", async () => {
    await markBackgroundPushReminderDisabled();

    expect(keyValueStorageMock.writeMobileKeyValue).toHaveBeenCalledWith(
      "tuanchat.mobile.background-push-reminder.v1",
      true,
    );
  });
});
