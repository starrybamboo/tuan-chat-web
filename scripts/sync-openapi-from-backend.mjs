import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openapiUrl = process.env.TUANCHAT_OPENAPI_URL ?? "http://127.0.0.1:8081/v3/api-docs";
const generatorSpecPath = resolve(repoRoot, "packages/tuanchat-openapi-client/tuanchat_OpenAPI.json");
const webSpecPath = resolve(repoRoot, "apps/web/api/tuanchat_OpenAPI.json");
const generatedSourceDir = resolve(repoRoot, "packages/tuanchat-openapi-client/src");

async function fetchOpenApiSpec() {
  const response = await fetch(openapiUrl);
  if (!response.ok) {
    throw new Error(`OpenAPI 导出失败：${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function parseSpec(source, label) {
  try {
    return JSON.parse(source.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`);
  }
}

function writeUtf8File(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function runPnpmOpenapi() {
  const result = spawnSync("pnpm", ["openapi"], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw new Error(`pnpm openapi 启动失败：${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`pnpm openapi 执行失败，退出码：${result.status ?? "unknown"}`);
  }
}

function* listTypeScriptFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const path = resolve(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      yield* listTypeScriptFiles(path);
      continue;
    }
    if (entry.endsWith(".ts")) {
      yield path;
    }
  }
}

function normalizeGeneratedTrailingNewlines() {
  for (const path of listTypeScriptFiles(generatedSourceDir)) {
    const source = readFileSync(path, "utf8");
    const nextSource = source.replace(/(?:\r?\n)+$/u, "\n");
    if (nextSource !== source) {
      writeFileSync(path, nextSource, "utf8");
    }
  }
}

function assertOpenApiShape(spec, label) {
  if (typeof spec !== "object" || spec === null) {
    throw new Error(`${label} 不是 OpenAPI 对象。`);
  }
  if (typeof spec.openapi !== "string") {
    throw new Error(`${label} 缺少 openapi 版本字段。`);
  }
  if (typeof spec.paths !== "object" || spec.paths === null) {
    throw new Error(`${label} 缺少 paths 对象。`);
  }
}

async function main() {
  console.log(`Exporting OpenAPI from ${openapiUrl}`);
  const specBuffer = await fetchOpenApiSpec();
  const spec = parseSpec(specBuffer, "后端 OpenAPI 响应");

  assertOpenApiShape(spec, "后端 OpenAPI 响应");

  writeUtf8File(generatorSpecPath, specBuffer);
  writeUtf8File(webSpecPath, specBuffer);

  runPnpmOpenapi();
  normalizeGeneratedTrailingNewlines();

  const generatedSpec = parseSpec(readFileSync(generatorSpecPath), "生成客户端 OpenAPI 快照");
  const webSpec = parseSpec(readFileSync(webSpecPath), "Web OpenAPI 快照");
  assertOpenApiShape(generatedSpec, "生成客户端 OpenAPI 快照");
  assertOpenApiShape(webSpec, "Web OpenAPI 快照");

  console.log("OpenAPI sync completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
