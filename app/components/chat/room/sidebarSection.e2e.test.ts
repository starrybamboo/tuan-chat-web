import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, it } from "vitest";

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

describe("sidebar section browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-sidebar-section-e2e-"));
    bundlePath = path.join(tempDir, "sidebar-section-harness.js");

    await build({
      entryPoints: [
        "D:\\A_collection\\tuan-chat-web\\app\\components\\chat\\room\\sidebarSection.e2e.harness.tsx",
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

  it("点击区块标题会切换折叠状态，点击右侧操作不会误触发折叠", async () => {
    const { context, page } = await createPage();
    try {
      await expectText(page, "expanded-state", "expanded");
      await expectText(page, "toggle-count", "0");
      await expectText(page, "action-count", "0");

      await page.getByText("频道与文档").click();
      await expectText(page, "expanded-state", "collapsed");
      await expectText(page, "toggle-count", "1");

      await page.getByText("频道与文档").click();
      await expectText(page, "expanded-state", "expanded");
      await expectText(page, "toggle-count", "2");

      await page.getByTitle("导入素材包").click();
      await expectText(page, "expanded-state", "expanded");
      await expectText(page, "toggle-count", "2");
      await expectText(page, "action-count", "1");
    }
    finally {
      await context.close();
    }
  }, 30_000);
});
