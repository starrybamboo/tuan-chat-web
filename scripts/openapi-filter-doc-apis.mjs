import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const specPaths = [
  resolve(repoRoot, "apps/web/api/tuanchat_OpenAPI.json"),
  resolve(repoRoot, "packages/tuanchat-openapi-client/tuanchat_OpenAPI.json"),
];
const generationSpecPath = specPaths[1];
const _outputDir = resolve(repoRoot, "packages/tuanchat-openapi-client/src");
const REMOVED_PATH_PREFIXES = [
  "/blocksuite/",
  "/collection",
  "/community",
  "/mark",
  "/rating",
  "/resource",
  "/s/",
  "/space/docFolder",
  "/space/userDoc",
];
const REMOVED_EXACT_PATHS = new Set(["/generate", "/media/aliases"]);
const REMOVED_SCHEMA_PREFIXES = [
  "ApiResultBlocksuite",
  "BlocksuiteDoc",
  "ApiResultCollection",
  "ApiResultPageBaseRespCollection",
  "Collection",
  "PageBaseRespCollection",
  "ApiResultCommunity",
  "ApiResultListCommunity",
  "Community",
  "ApiResultCursorPageBaseResponsePost",
  "ApiResultPost",
  "CursorPageBaseResponsePost",
  "PagePost",
  "Post",
  "ApiResultListMark",
  "BatchMark",
  "Mark",
  "ApiResultMediaFileAlias",
  "MediaFileAlias",
  "ApiResultPageBaseRespRating",
  "ApiResultRating",
  "PageBaseRespRating",
  "Rating",
  "ApiResultPageBaseRespResource",
  "ApiResultResource",
  "PageBaseRespResource",
  "Resource",
  "ApiResultListSpaceUserDoc",
  "ApiResultSpaceUserDoc",
  "ShortLink",
  "SpaceUserDoc",
];
const REMOVED_TAG_FRAGMENTS = [
  "blocksuite",
  "collection",
  "community",
  "mark",
  "rating",
  "resource",
  "shortlink",
  "spaceuserdoc",
];

function shouldRemovePath(path) {
  return REMOVED_EXACT_PATHS.has(path)
    || REMOVED_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix));
}

function shouldRemoveSchema(name) {
  return REMOVED_SCHEMA_PREFIXES.some(prefix => name.startsWith(prefix));
}

function filterOpenApiSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("OpenAPI spec 格式无效");
  }

  const nextSpec = structuredClone(spec);
  const paths = nextSpec.paths && typeof nextSpec.paths === "object" ? nextSpec.paths : {};
  for (const path of Object.keys(paths)) {
    if (shouldRemovePath(path)) {
      delete paths[path];
    }
  }

  const schemas = nextSpec.components?.schemas && typeof nextSpec.components.schemas === "object"
    ? nextSpec.components.schemas
    : null;
  if (schemas) {
    for (const name of Object.keys(schemas)) {
      if (shouldRemoveSchema(name)) {
        delete schemas[name];
      }
    }
  }

  if (Array.isArray(nextSpec.tags)) {
    nextSpec.tags = nextSpec.tags.filter((tag) => {
      const text = `${tag?.name ?? ""} ${tag?.description ?? ""}`.toLowerCase();
      return !REMOVED_TAG_FRAGMENTS.some(fragment => text.includes(fragment));
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

for (const specPath of specPaths) {
  const raw = await readFile(specPath, "utf8");
  const parsed = JSON.parse(raw);
  const filtered = filterOpenApiSpec(parsed);
  await writeFile(specPath, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
}

const result = spawnSync(
  "openapi",
  [
    "--input",
    generationSpecPath,
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
