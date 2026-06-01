import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const DEFAULT_INPUT_FILE = ".auth/e2e-storage-state.json";

function printHelp() {
  console.log(`Usage: pnpm e2e:browser-auth-snippet [options]

Generate a browser-console snippet from the Playwright storageState file.

Options:
  --input <path>      storageState input path. Default: ${DEFAULT_INPUT_FILE}
  --origin <url>      Origin to read from storageState. Defaults to the only origin.
  --output <path>     Write the snippet to a file instead of stdout.
  --no-reload         Do not reload the page after applying localStorage.
  --help              Show this help.
`);
}

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--no-reload") {
      options.reload = false;
      continue;
    }
    if (!arg.startsWith("--")) {
      throw new Error(`未知参数：${arg}`);
    }

    const [rawKey, inlineValue] = arg.split("=", 2);
    const key = rawKey.slice(2);
    const value = inlineValue ?? argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`参数 ${rawKey} 缺少值`);
    }
    if (inlineValue === undefined) {
      index += 1;
    }
    options[key] = value;
  }

  return options;
}

function normalizeOrigin(value) {
  return new URL(value).origin;
}

function findOriginState(state, origin) {
  const origins = Array.isArray(state.origins) ? state.origins : [];
  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    const matched = origins.find(item => normalizeOrigin(item.origin) === normalizedOrigin);
    if (!matched) {
      throw new Error(`storageState 中找不到 origin：${normalizedOrigin}`);
    }
    return matched;
  }

  if (origins.length !== 1) {
    throw new Error("storageState 包含多个 origin，请用 --origin 指定要注入哪一个。");
  }
  return origins[0];
}

function readLocalStorageEntries(originState) {
  const entries = Array.isArray(originState.localStorage) ? originState.localStorage : [];
  const filteredEntries = entries
    .filter(entry => typeof entry?.name === "string" && typeof entry?.value === "string")
    .map(entry => ({ name: entry.name, value: entry.value }));

  if (!filteredEntries.some(entry => entry.name === "token" && entry.value.trim())) {
    throw new Error("storageState 缺少有效 token，请先运行 pnpm test:e2e:auth-state。");
  }

  return filteredEntries;
}

function buildSnippet(entries, shouldReload) {
  const reloadLine = shouldReload ? "  window.location.reload();\n" : "";
  return `(() => {
  const entries = ${JSON.stringify(entries, null, 2)};
  for (const { name, value } of entries) {
    window.localStorage.setItem(name, value);
  }
  window.dispatchEvent(new Event("tuanchat:e2e-auth-applied"));
${reloadLine}})();
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const input = resolve(options.input || process.env.TC_E2E_STORAGE_STATE || DEFAULT_INPUT_FILE);
  const rawState = await readFile(input, "utf8");
  const state = JSON.parse(rawState);
  const originState = findOriginState(state, options.origin);
  const entries = readLocalStorageEntries(originState);
  const snippet = buildSnippet(entries, options.reload !== false);

  if (options.output) {
    const output = resolve(options.output);
    await writeFile(output, snippet, "utf8");
    console.log(`[e2e-browser-auth-snippet] 已写入 ${output}`);
    console.log(`[e2e-browser-auth-snippet] origin=${normalizeOrigin(originState.origin)}`);
    return;
  }

  process.stdout.write(snippet);
}

main().catch((error) => {
  console.error(`[e2e-browser-auth-snippet] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
