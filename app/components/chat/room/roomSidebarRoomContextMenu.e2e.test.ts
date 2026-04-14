import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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

async function expectText(page: Page, testId: string, expected: string) {
  await page.waitForFunction(
    ([id, value]) => document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim() === value,
    [testId, expected],
  );
}

async function createPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><body><div id=\"app\"></div></body></html>");
  await page.addScriptTag({ path: bundlePath });
  await expectText(page, "harness-ready", "ready");
  return { context, page };
}

describe("room sidebar context menu browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-room-sidebar-contextmenu-e2e-"));
    bundlePath = path.join(tempDir, "room-sidebar-contextmenu-harness.js");

    await build({
      entryPoints: [
        "D:\\A_collection\\tuan-chat-web\\app\\components\\chat\\room\\roomSidebarRoomContextMenu.e2e.harness.tsx",
      ],
      outfile: bundlePath,
      bundle: true,
      format: "iife",
      platform: "browser",
      target: ["chrome120"],
      jsx: "automatic",
      define: {
        "process.env.NODE_ENV": "\"test\"",
        "import.meta.env.DEV": "false",
        "import.meta.env.MODE": "\"test\"",
      },
      loader: {
        ".css": "empty",
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

  it("右键嵌套包裹层内的房间标题仍会弹出房间菜单", async () => {
    const { context, page } = await createPage();
    try {
      await expectText(page, "selected-room-id", "null");
      await expectText(page, "context-room-id", "null");

      await page.getByText("灵感").click({ button: "right" });

      await expectText(page, "selected-room-id", "null");
      await expectText(page, "context-room-id", "1001");
      await page.getByText("房间资料").waitFor();
      await expect(await page.getByText("房间资料").isVisible()).toBe(true);
      await expect(await page.getByText("邀请玩家").isVisible()).toBe(true);
      await expect(await page.getByText("关闭消息提醒").isVisible()).toBe(true);
      await expect(await page.getByText("解散房间").isVisible()).toBe(true);
    }
    finally {
      await context.close();
    }
  }, 30_000);
});
