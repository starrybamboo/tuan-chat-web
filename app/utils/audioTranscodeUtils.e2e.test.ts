import type { Browser, Page } from "playwright";

import { build } from "esbuild";
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const PROJECT_ROOT = "D:\\A_collection\\tuan-chat-web";
const PROVIDED_AUDIO_FIXTURE_PATH = "D:\\software\\FormatFactory\\Music\\Sport\\48s Come Back.mp3";

let browser: Browser;
let tempDir = "";
let bundlePath = "";
let fixturePath = "";
let serverBaseUrl = "";
let stopServer: (() => Promise<void>) | null = null;

function resolveAppAlias(specifier: string) {
  const withoutAlias = specifier.slice(2);
  const basePath = path.join(PROJECT_ROOT, "app", withoutAlias);
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

function ensureFallbackAudioFixture(targetPath: string): void {
  const sampleRate = 16_000;
  const durationSec = 1;
  const sampleCount = sampleRate * durationSec;
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < sampleCount; i += 1) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    buffer.writeInt16LE(Math.round(sample * 0x7FFF), 44 + i * 2);
  }

  writeFileSync(targetPath, buffer);
}

function getMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (lower.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (lower.endsWith(".wasm")) {
    return "application/wasm";
  }
  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  return "application/octet-stream";
}

function resolveStaticFilePath(requestPath: string): string | null {
  const normalizedPath = requestPath.split("?")[0];
  if (normalizedPath === "/" || normalizedPath === "/index.html") {
    return path.join(tempDir, "index.html");
  }
  if (normalizedPath === "/harness.js") {
    return bundlePath;
  }

  const mappings = [
    {
      prefix: "/ffmpeg-wrapper/",
      baseDir: path.join(PROJECT_ROOT, "node_modules", "@ffmpeg", "ffmpeg", "dist", "esm"),
    },
    {
      prefix: "/ffmpeg-core/dist/esm/",
      baseDir: path.join(PROJECT_ROOT, "node_modules", "@ffmpeg", "core", "dist", "esm"),
    },
    {
      prefix: "/ffmpeg-core/dist/umd/",
      baseDir: path.join(PROJECT_ROOT, "node_modules", "@ffmpeg", "core", "dist", "umd"),
    },
  ] as const;

  for (const mapping of mappings) {
    if (!normalizedPath.startsWith(mapping.prefix)) {
      continue;
    }

    const relativePath = normalizedPath.slice(mapping.prefix.length).replace(/^\/+/, "");
    const candidate = path.resolve(mapping.baseDir, relativePath);
    const expectedPrefix = `${path.resolve(mapping.baseDir)}${path.sep}`;
    if (candidate.startsWith(expectedPrefix) || candidate === path.resolve(mapping.baseDir)) {
      return candidate;
    }
  }

  return null;
}

async function startStaticServer(): Promise<{ baseUrl: string; stop: () => Promise<void> }> {
  const server = createServer((request, response) => {
    const filePath = resolveStaticFilePath(request.url || "/");
    if (!filePath || !existsSync(filePath)) {
      response.statusCode = 404;
      response.end("not found");
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", getMimeType(filePath));
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Content-Length", String(statSync(filePath).size));
    createReadStream(filePath).pipe(response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("无法启动本地静态服务");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function expectText(page: Page, testId: string, expected: string) {
  await page.waitForFunction(
    ([id, value]) => document.querySelector(`[data-testid="${id}"]`)?.textContent?.trim() === value,
    [testId, expected],
  );
}

describe("audioTranscodeUtils browser e2e", () => {
  beforeAll(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "tc-audio-transcode-e2e-"));
    bundlePath = path.join(tempDir, "audio-transcode-harness.js");

    fixturePath = existsSync(PROVIDED_AUDIO_FIXTURE_PATH)
      ? PROVIDED_AUDIO_FIXTURE_PATH
      : path.join(tempDir, "fallback-audio.wav");
    if (!existsSync(fixturePath)) {
      ensureFallbackAudioFixture(fixturePath);
    }

    writeFileSync(
      path.join(tempDir, "index.html"),
      "<!doctype html><html><body><div id=\"app\"></div><script type=\"module\" src=\"/harness.js\"></script></body></html>",
      { encoding: "utf-8" },
    );

    const server = await startStaticServer();
    serverBaseUrl = server.baseUrl;
    stopServer = server.stop;

    await build({
      entryPoints: [
        path.join(PROJECT_ROOT, "app", "utils", "audioTranscodeUtils.e2e.harness.ts"),
      ],
      outfile: bundlePath,
      bundle: true,
      format: "esm",
      platform: "browser",
      target: ["chrome120"],
      define: {
        "process.env.NODE_ENV": "\"test\"",
        "import.meta.env": JSON.stringify({
          MODE: "test",
          DEV: false,
          VITE_FFMPEG_CORE_BASE_URL: `${serverBaseUrl}/ffmpeg-core/dist/umd`,
          VITE_FFMPEG_CORE_SKIP_BUNDLED: "true",
        }),
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
        {
          name: "resolve-vite-ffmpeg-url-imports",
          setup(buildApi) {
            const virtualNamespace = "ffmpeg-url";
            const urlMap = new Map<string, string>([
              ["@ffmpeg/core?url", `${serverBaseUrl}/ffmpeg-core/dist/esm/ffmpeg-core.js`],
              ["@ffmpeg/core/wasm?url", `${serverBaseUrl}/ffmpeg-core/dist/esm/ffmpeg-core.wasm`],
              ["@ffmpeg/ffmpeg/worker?worker&url", `${serverBaseUrl}/ffmpeg-wrapper/worker.js`],
            ]);

            buildApi.onResolve({ filter: /^@ffmpeg\/core\?url$|^@ffmpeg\/core\/wasm\?url$|^@ffmpeg\/ffmpeg\/worker\?worker&url$/ }, (args) => {
              return {
                path: args.path,
                namespace: virtualNamespace,
              };
            });

            buildApi.onLoad({ filter: /.*/, namespace: virtualNamespace }, (args) => {
              const resolvedUrl = urlMap.get(args.path);
              if (!resolvedUrl) {
                throw new Error(`未配置 FFmpeg 资源映射：${args.path}`);
              }
              return {
                contents: `export default ${JSON.stringify(resolvedUrl)};`,
                loader: "js",
              };
            });
          },
        },
      ],
    });

    browser = await chromium.launch({ headless: true });
  }, 180_000);

  afterAll(async () => {
    await browser?.close();
    if (stopServer) {
      await stopServer();
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60_000);

  it("旧的 UMD core 配置会被自动规范到 ESM，并成功完成音频转码", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    try {
      await page.goto(`${serverBaseUrl}/`, { waitUntil: "networkidle" });
      await expectText(page, "harness-ready", "ready");

      await page.getByTestId("audio-input").setInputFiles(fixturePath);
      await page.getByTestId("run-transcode").click();

      await page.waitForFunction(() => {
        const status = document.querySelector("[data-testid=\"status\"]")?.textContent?.trim();
        return status === "success" || status === "error";
      }, undefined, { timeout: 180_000 });

      const status = await page.getByTestId("status").textContent();
      const errorMessage = (await page.getByTestId("error-message").textContent())?.trim() || "";
      expect(pageErrors, pageErrors.join("\n")).toEqual([]);
      expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
      expect(status?.trim(), errorMessage).toBe("success");

      const outputName = (await page.getByTestId("output-name").textContent())?.trim() || "";
      const outputType = (await page.getByTestId("output-type").textContent())?.trim() || "";
      const outputSize = Number((await page.getByTestId("output-size").textContent())?.trim() || "0");

      expect(outputName).toMatch(/\.webm$/i);
      expect(outputType).toBe("audio/webm");
      expect(outputSize).toBeGreaterThan(0);
    }
    finally {
      await context.close();
    }
  }, 180_000);
});
