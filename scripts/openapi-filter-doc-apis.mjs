import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const specPath = resolve(repoRoot, "packages/tuanchat-openapi-client/tuanchat_OpenAPI.json");
const outputDir = resolve(repoRoot, "packages/tuanchat-openapi-client/src");

function filterOpenApiSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("OpenAPI spec 格式无效");
  }

  const nextSpec = structuredClone(spec);
  const paths = nextSpec.paths && typeof nextSpec.paths === "object" ? nextSpec.paths : {};
  for (const path of Object.keys(paths)) {
    if (path.startsWith("/blocksuite/")) {
      delete paths[path];
    }
  }

  const schemas = nextSpec.components?.schemas && typeof nextSpec.components.schemas === "object"
    ? nextSpec.components.schemas
    : null;
  if (schemas) {
    for (const name of Object.keys(schemas)) {
      if (name.startsWith("Blocksuite") || name.startsWith("ApiResultBlocksuite")) {
        delete schemas[name];
      }
    }
  }

  if (Array.isArray(nextSpec.tags)) {
    nextSpec.tags = nextSpec.tags.filter((tag) => {
      const text = `${tag?.name ?? ""} ${tag?.description ?? ""}`.toLowerCase();
      return !text.includes("blocksuite");
    });
  }

  const replaceDeprecatedText = (value) => {
    if (Array.isArray(value)) {
      return value.map(item => replaceDeprecatedText(item));
    }
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        value[key] = replaceDeprecatedText(item);
      }
      return value;
    }
    if (typeof value === "string") {
      return value.replace(/blocksuite/gi, "文档");
    }
    return value;
  };

  replaceDeprecatedText(nextSpec);

  return nextSpec;
}

const raw = await readFile(specPath, "utf8");
const parsed = JSON.parse(raw);
const filtered = filterOpenApiSpec(parsed);
await writeFile(specPath, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");

const result = spawnSync(
  "openapi",
  [
    "--input",
    "./packages/tuanchat-openapi-client/tuanchat_OpenAPI.json",
    "--output",
    "./packages/tuanchat-openapi-client/src",
    "--client",
    "fetch",
    "--name",
    "TuanChat",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.status !== 0) {
  throw new Error(`openapi 生成失败，退出码：${result.status ?? "unknown"}`);
}
