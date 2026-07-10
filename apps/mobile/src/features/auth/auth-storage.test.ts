import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStoreMock = vi.hoisted(() => ({
  deleteItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => secureStoreMock);

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

async function importAuthStorage() {
  return await import("./auth-storage");
}

describe("auth-storage", () => {
  beforeEach(() => {
    vi.resetModules();
    secureStoreMock.deleteItemAsync.mockReset();
    secureStoreMock.getItemAsync.mockReset();
    secureStoreMock.setItemAsync.mockReset();
  });

  it("caches the token after the first SecureStore read", async () => {
    secureStoreMock.getItemAsync.mockResolvedValue(JSON.stringify({ token: "token-1", userId: 7 }));
    const storage = await importAuthStorage();

    await expect(storage.getStoredAuthToken()).resolves.toBe("token-1");
    await expect(storage.getStoredAuthToken()).resolves.toBe("token-1");

    expect(secureStoreMock.getItemAsync).toHaveBeenCalledTimes(1);
  });

  it("uses the just-written session without reading SecureStore again", async () => {
    secureStoreMock.setItemAsync.mockResolvedValue(undefined);
    const storage = await importAuthStorage();

    await storage.writeStoredAuthSession({ token: "written-token", userId: 8 });

    await expect(storage.getStoredAuthToken()).resolves.toBe("written-token");
    expect(secureStoreMock.setItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStoreMock.getItemAsync).not.toHaveBeenCalled();
  });

  it("clears the cached token when the stored session is cleared", async () => {
    secureStoreMock.getItemAsync.mockResolvedValue(JSON.stringify({ token: "token-1" }));
    secureStoreMock.deleteItemAsync.mockResolvedValue(undefined);
    const storage = await importAuthStorage();

    await expect(storage.getStoredAuthToken()).resolves.toBe("token-1");
    await storage.clearStoredAuthSession();

    await expect(storage.getStoredAuthToken()).resolves.toBeNull();
    expect(secureStoreMock.getItemAsync).toHaveBeenCalledTimes(1);
  });
});
