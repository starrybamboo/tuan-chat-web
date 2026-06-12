import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let browser: Browser;
let tempDir = "";
let bundlePath = "";
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const appRoot = path.resolve(packageRoot, "app");

function resolveAppAlias(specifier: string) {
  const withoutAlias = specifier.slice(2);
  const basePath = path.resolve(appRoot, withoutAlias);
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
    { timeout: 5_000 },
  );
}

async function createPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  page.on("pageerror", error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(`console error: ${message.text()}`);
    }
  });
  await page.route("http://localhost/**", (route) => {
    const resourceType = route.request().resourceType();
    return route.fulfill({
      body: resourceType === "document" ? "<!doctype html><html><body><div id=\"app\"></div></body></html>" : "",
      contentType: resourceType === "document" ? "text/html" : "text/plain",
      status: 200,
    });
  });
  await page.goto("http://localhost/");
  await page.addScriptTag({ path: bundlePath });
  try {
    await expectText(page, "harness-ready", "ready");
  }
  catch (error) {
    const bodyText = await page.locator("body").textContent().catch(() => "");
    throw new Error([
      "room sidebar context menu harness did not become ready",
      ...runtimeErrors,
      `body: ${bodyText ?? ""}`,
      error instanceof Error ? error.message : String(error),
    ].filter(Boolean).join("\n"));
  }
  return { context, page };
}

describe("room sidebar context menu browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-room-sidebar-contextmenu-e2e-"));
    bundlePath = path.join(tempDir, "room-sidebar-contextmenu-harness.js");

    await build({
      absWorkingDir: packageRoot,
      entryPoints: [
        path.resolve(appRoot, "components/chat/room/roomSidebarRoomContextMenu.e2e.harness.tsx"),
      ],
      outfile: bundlePath,
      bundle: true,
      format: "iife",
      platform: "browser",
      target: ["chrome120"],
      jsx: "automatic",
      define: {
        "process.env.NODE_ENV": "\"test\"",
        "import.meta.env": JSON.stringify({
          DEV: false,
          MODE: "test",
          VITE_MEDIA_CDN_BASE_URL: "",
        }),
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
      await expect(await page.getByText("房间成员").isVisible()).toBe(true);
      await expect(await page.getByText("房间角色").isVisible()).toBe(true);
      await expect(await page.getByText("邀请玩家").isVisible()).toBe(true);
      await expect(await page.getByText("关闭消息提醒").isVisible()).toBe(true);
      await expect(await page.getByText("解散房间").isVisible()).toBe(true);
    }
    finally {
      await context.close();
    }
  }, 30_000);
});
