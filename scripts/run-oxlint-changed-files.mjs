import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);

function abort(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    cwd: ".",
    config: ".oxlintrc.json",
    scopes: [],
    excludePrefixes: [],
    passThrough: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--cwd") {
      options.cwd = argv[index + 1] ?? abort("Missing value for --cwd");
      index += 1;
      continue;
    }
    if (arg === "--config") {
      options.config = argv[index + 1] ?? abort("Missing value for --config");
      index += 1;
      continue;
    }
    if (arg === "--scope") {
      options.scopes.push(argv[index + 1] ?? abort("Missing value for --scope"));
      index += 1;
      continue;
    }
    if (arg === "--exclude-prefix") {
      options.excludePrefixes.push(argv[index + 1] ?? abort("Missing value for --exclude-prefix"));
      index += 1;
      continue;
    }
    options.passThrough.push(arg);
  }

  if (options.scopes.length === 0) {
    options.scopes.push(options.cwd);
  }

  return options;
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    abort(result.stderr || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function normalizeRepoPath(input) {
  if (!input || input === ".") {
    return "";
  }
  return input.split(path.sep).join("/").replace(/^\.\/+/u, "").replace(/\/+$/u, "");
}

function isWithinScope(repoPath, scopes) {
  return scopes.some((scope) => scope === "" || repoPath === scope || repoPath.startsWith(`${scope}/`));
}

function isExcluded(repoPath, prefixes) {
  return prefixes.some((prefix) => prefix !== "" && (repoPath === prefix || repoPath.startsWith(`${prefix}/`)));
}

function collectChangedRepoPaths(repoRoot) {
  const output = runGit(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const paths = new Set();

  for (const line of output.split("\n")) {
    if (!line) {
      continue;
    }
    const payload = line.slice(3).trim();
    const repoPath = payload.includes(" -> ") ? payload.split(" -> ").at(-1) : payload;
    if (repoPath) {
      paths.add(repoPath);
    }
  }

  return [...paths];
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = runGit(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const targetCwd = path.resolve(repoRoot, options.cwd);
  const scopes = options.scopes.map(normalizeRepoPath);
  const excludePrefixes = options.excludePrefixes.map(normalizeRepoPath);

  const matchedRepoPaths = collectChangedRepoPaths(repoRoot)
    .map((repoPath) => normalizeRepoPath(repoPath))
    .filter((repoPath) => repoPath && isWithinScope(repoPath, scopes))
    .filter((repoPath) => !isExcluded(repoPath, excludePrefixes))
    .filter((repoPath) => DEFAULT_EXTENSIONS.has(path.extname(repoPath)))
    .filter((repoPath) => existsSync(path.resolve(repoRoot, repoPath)))
    .sort((left, right) => left.localeCompare(right, "en"));

  if (matchedRepoPaths.length === 0) {
    console.log(`No changed files matched lint scope: ${scopes.join(", ") || "."}`);
    return;
  }

  const relativeFiles = matchedRepoPaths.map((repoPath) => path.relative(targetCwd, path.resolve(repoRoot, repoPath)));
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "oxlint",
      ...relativeFiles,
      "--config",
      options.config,
      "--no-error-on-unmatched-pattern",
      ...options.passThrough,
    ],
    {
      cwd: targetCwd,
      stdio: "inherit",
    },
  );

  process.exit(result.status ?? 1);
}

main();
