import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, it } from "vitest";

let browser: Browser;
let tempDir = "";
let bundlePath = "";
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const appRoot = path.resolve(packageRoot, "app");
const requireFromPackage = createRequire(path.join(packageRoot, "package.json"));
const singletonModulePaths = new Map([
  ["react", requireFromPackage.resolve("react")],
  ["react/jsx-runtime", requireFromPackage.resolve("react/jsx-runtime")],
  ["react/jsx-dev-runtime", requireFromPackage.resolve("react/jsx-dev-runtime")],
  ["react-dom", requireFromPackage.resolve("react-dom")],
  ["react-dom/client", requireFromPackage.resolve("react-dom/client")],
]);

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

describe("room sidebar category header browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-room-sidebar-category-header-e2e-"));
    bundlePath = path.join(tempDir, "room-sidebar-category-header-harness.js");

    await build({
      absWorkingDir: packageRoot,
      entryPoints: [
        path.resolve(appRoot, "components/chat/room/roomSidebarCategoryHeader.e2e.harness.tsx"),
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
            buildApi.onResolve({ filter: /^(react|react\/jsx-runtime|react\/jsx-dev-runtime|react-dom|react-dom\/client)$/ }, (args) => {
              const resolvedPath = singletonModulePaths.get(args.path);
              if (!resolvedPath) {
                throw new Error(`未能解析单例模块：${args.path}`);
              }
              return { path: resolvedPath };
            });
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

  it("点击分类标题会切换折叠状态，点击加号不会误触发折叠", async () => {
    const { context, page } = await createPage();
    try {
      await expectText(page, "collapsed-state", "expanded");
      await expectText(page, "toggle-count", "0");
      await expectText(page, "add-count", "0");

      await page.getByText("频道").click();
      await expectText(page, "collapsed-state", "collapsed");
      await expectText(page, "toggle-count", "1");

      await page.getByText("频道").click();
      await expectText(page, "collapsed-state", "expanded");
      await expectText(page, "toggle-count", "2");

      await page.getByTestId("header-shell").hover();
      await page.getByTitle("添加").click();
      await expectText(page, "collapsed-state", "expanded");
      await expectText(page, "toggle-count", "2");
      await expectText(page, "add-count", "1");
    }
    finally {
      await context.close();
    }
  }, 30_000);
});
