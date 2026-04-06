import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type MockAudioStats = {
  created: number;
  playCalls: number;
  pauseCalls: number;
  loadCalls: number;
};

let browser: Browser;
let tempDir = "";
let bundlePath = "";

function resolveAppAlias(specifier: string) {
  const withoutAlias = specifier.slice(2);
  const basePath = path.join("D:\\A_collection\\tuan-chat-web\\app", withoutAlias);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
    path.join(basePath, "index.jsx"),
  ];

  const matched = candidates.find(candidate => existsSync(candidate));
  if (!matched) {
    throw new Error(`无法解析 @ 别名：${specifier}`);
  }
  return matched;
}

async function createPage() {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent("<!doctype html><html><body><div id=\"app\"></div></body></html>");
  await page.evaluate(() => {
    const stats = {
      created: 0,
      playCalls: 0,
      pauseCalls: 0,
      loadCalls: 0,
    };

    class MockAudio {
      preload = "";
      loop = false;
      crossOrigin = "";
      src = "";
      volume = 1;
      currentTime = 0;
      paused = true;

      async play() {
        stats.playCalls += 1;
        this.paused = false;
      }

      pause() {
        stats.pauseCalls += 1;
        this.paused = true;
      }

      load() {
        stats.loadCalls += 1;
      }
    }

    Object.defineProperty(window, "__TC_AUDIO_E2E__", {
      configurable: true,
      value: stats,
    });
    Object.defineProperty(window, "Audio", {
      configurable: true,
      writable: true,
      value: function MockAudioFactory() {
        stats.created += 1;
        return new MockAudio();
      },
    });
  });
  await page.addScriptTag({ path: bundlePath });
  await expectText(page, "harness-ready", "ready");
  await expectText(page, "active-room-id", "1001");
  return { context, page };
}

async function expectText(page: Page, testId: string, expected: string) {
  await page.waitForFunction(
    ([id, value]) => document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim() === value,
    [testId, expected],
  );
}

async function readAudioStats(page: Page) {
  return page.evaluate(() => structuredClone((window as typeof window & { __TC_AUDIO_E2E__: MockAudioStats }).__TC_AUDIO_E2E__));
}

describe("audioMessage auto play browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-audio-autoplay-e2e-"));
    bundlePath = path.join(tempDir, "audio-autoplay-harness.js");

    await build({
      entryPoints: [
        "D:\\A_collection\\tuan-chat-web\\app\\components\\chat\\infra\\audioMessage\\audioMessageAutoPlay.e2e.harness.tsx",
      ],
      outfile: bundlePath,
      bundle: true,
      format: "iife",
      platform: "browser",
      target: ["chrome120"],
      jsx: "automatic",
      define: {
        "process.env.NODE_ENV": "\"test\"",
      },
      plugins: [
        {
          name: "resolve-app-alias",
          setup(buildApi) {
            buildApi.onResolve({ filter: /^@\// }, (args) => {
              return {
                path: resolveAppAlias(args.path),
              };
            });
          },
        },
      ],
    });

    browser = await chromium.launch({ headless: true });
  }, 90_000);

  afterAll(async () => {
    await browser?.close();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("非当前房间 WS 更新不会 seed BGM 自动播放", async () => {
    const { context, page } = await createPage();
    try {
      await page.getByTestId("trigger-ws-other-room-bgm").click();
      await expectText(page, "last-trigger-result", "ignored");
      await expectText(page, "pending-purpose", "none");

      const stats = await readAudioStats(page);
      expect(stats).toEqual({
        created: 0,
        playCalls: 0,
        pauseCalls: 0,
        loadCalls: 0,
      });
    }
    finally {
      await context.close();
    }
  });

  it("首发本地发送 BGM 会先启动 fallback，再在可见控制器挂载后接管", async () => {
    const { context, page } = await createPage();
    try {
      await page.getByTestId("trigger-local-send-bgm").click();
      await expectText(page, "last-trigger-result", "enqueued");
      await expectText(page, "pending-purpose", "bgm");

      expect(await readAudioStats(page)).toEqual({
        created: 1,
        playCalls: 1,
        pauseCalls: 0,
        loadCalls: 0,
      });

      await page.getByTestId("mount-visual-probe").click();
      await expectText(page, "visual-mounted", "yes");
      await expectText(page, "pending-purpose", "none");
      await expectText(page, "visual-auto-play-status", "started");
      await expectText(page, "visual-is-playing", "yes");
      await expectText(page, "visual-play-count", "1");

      const statsAfterHandover = await readAudioStats(page);
      expect(statsAfterHandover.created).toBe(1);
      expect(statsAfterHandover.playCalls).toBe(1);
      expect(statsAfterHandover.pauseCalls).toBe(1);
    }
    finally {
      await context.close();
    }
  });

  it("当前房间 WS 首次出现 BGM annotation 时也会触发自动播放", async () => {
    const { context, page } = await createPage();
    try {
      await page.getByTestId("trigger-ws-current-room-bgm").click();
      await expectText(page, "last-trigger-result", "enqueued");
      await expectText(page, "pending-purpose", "bgm");

      const statsAfterSeed = await readAudioStats(page);
      expect(statsAfterSeed.created).toBe(1);
      expect(statsAfterSeed.playCalls).toBe(1);

      await page.getByTestId("mount-visual-probe").click();
      await expectText(page, "visual-auto-play-status", "started");
      await expectText(page, "pending-purpose", "none");
      await expectText(page, "visual-is-playing", "yes");
      await expectText(page, "visual-play-count", "1");
    }
    finally {
      await context.close();
    }
  });

  it("可见播放器首次接管失败后会保留 pending，并在下一次用户手势时重试", async () => {
    const { context, page } = await createPage();
    try {
      await page.getByTestId("block-next-visual-start").click();
      await page.getByTestId("trigger-local-send-bgm").click();
      await expectText(page, "pending-purpose", "bgm");
      await page.getByTestId("mount-visual-probe").click();

      await expectText(page, "visual-auto-play-status", "failed");
      await expectText(page, "pending-purpose", "bgm");
      await expectText(page, "visual-is-playing", "no");

      const statsAfterFailedHandover = await readAudioStats(page);
      expect(statsAfterFailedHandover.pauseCalls).toBe(0);

      await page.getByTestId("gesture-retry").click();
      await expectText(page, "visual-auto-play-status", "started");
      await expectText(page, "pending-purpose", "none");
      await expectText(page, "visual-is-playing", "yes");

      const statsAfterRetry = await readAudioStats(page);
      expect(statsAfterRetry.pauseCalls).toBe(1);
    }
    finally {
      await context.close();
    }
  });
});
