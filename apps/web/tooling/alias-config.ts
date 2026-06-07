import fs from "node:fs";
import path from "node:path";

const WEB_TS_CONFIG = "tsconfig.json";

function escapeForRegExp(input: string) {
  return input.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readWebTsPaths(projectRoot: string) {
  const configPath = path.resolve(projectRoot, WEB_TS_CONFIG);
  const rawConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    compilerOptions?: {
      paths?: Record<string, string[]>;
    };
  };
  return rawConfig.compilerOptions?.paths ?? {};
}

function toAliasEntry(projectRoot: string, key: string, targets: string[]) {
  const [firstTarget] = targets;
  if (typeof firstTarget !== "string" || !firstTarget.trim()) {
    return null;
  }

  if (key.endsWith("/*") && firstTarget.endsWith("/*")) {
    const keyPrefix = key.slice(0, -2);
    const targetPrefix = firstTarget.slice(0, -2);
    return {
      find: new RegExp(`^${escapeForRegExp(keyPrefix)}/(.*)$`),
      replacement: `${path.resolve(projectRoot, targetPrefix)}/$1`,
    };
  }

  return {
    find: new RegExp(`^${escapeForRegExp(key)}$`),
    replacement: path.resolve(projectRoot, firstTarget),
  };
}

export function getWebAliasEntries(projectRoot: string) {
  const paths = readWebTsPaths(projectRoot);
  return Object.entries(paths)
    .map(([key, targets]) => toAliasEntry(projectRoot, key, targets))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
