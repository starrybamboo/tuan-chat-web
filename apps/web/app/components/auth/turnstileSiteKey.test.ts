import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveTurnstileSiteKey } from "./turnstileSiteKey";

const PRODUCTION_SITE_KEY = "0x4AAAAAADuhW4KyzfPxtfWu";
const DEVELOPMENT_SITE_KEY = "1x00000000000000000000AA";

function stubWindowLocation(origin: string) {
  vi.stubGlobal("window", {
    location: {
      href: `${origin}/login`,
      origin,
      protocol: new URL(origin).protocol,
    },
    isSecureContext: true,
  });
}

describe("resolveTurnstileSiteKey", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("本地前端连接 localhost 后端时使用测试 Key", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "http://localhost:8081",
      envSiteKey: PRODUCTION_SITE_KEY,
    })).toBe(DEVELOPMENT_SITE_KEY);
  });

  it("本地前端连接 IPv4 回环后端时使用测试 Key", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "http://127.0.0.2:8081",
      envSiteKey: undefined,
    })).toBe(DEVELOPMENT_SITE_KEY);
  });

  it("本地前端连接云端后端时使用正式 Key", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "https://api.tuan.chat/api",
      envSiteKey: undefined,
    })).toBe(PRODUCTION_SITE_KEY);
  });

  it("云端后端会忽略 Cloudflare 测试 Key", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "https://api.tuan.chat/api",
      envSiteKey: DEVELOPMENT_SITE_KEY,
    })).toBe(PRODUCTION_SITE_KEY);
  });

  it("云端后端会保留显式配置的正式 Key", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "https://api.example.com/api",
      envSiteKey: "custom-production-site-key",
    })).toBe("custom-production-site-key");
  });

  it("托管页面使用相对 API 路径时按云端后端处理", () => {
    stubWindowLocation("https://test.tuan.chat");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "/api",
      envSiteKey: DEVELOPMENT_SITE_KEY,
    })).toBe(PRODUCTION_SITE_KEY);
  });

  it("局域网后端按正式环境处理", () => {
    stubWindowLocation("http://localhost:5177");

    expect(resolveTurnstileSiteKey({
      apiBaseUrl: "http://192.168.1.20:8081",
      envSiteKey: DEVELOPMENT_SITE_KEY,
    })).toBe(PRODUCTION_SITE_KEY);
  });
});
