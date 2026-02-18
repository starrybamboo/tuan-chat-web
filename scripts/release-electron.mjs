import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

process.chdir(projectRoot);

const HELP = `
用法：
  pnpm release:electron -- --bump patch
  pnpm release:electron -- --bump minor --local-build nsis
  pnpm release:electron -- --version 1.2.3

参数：
  --bump <patch|minor|major>   基于当前版本递增（与 --version 二选一）
  --version <x.y.z>            直接指定目标版本（与 --bump 二选一）
  --local-build <all|zip|nsis|none>
                               本地打包策略，默认 all（zip + nsis）
  --message <text>             自定义提交信息，默认 chore(release): v<version>
  --remote <name>              远端名，默认 origin
  --no-push                    仅本地提交，不推送
  --help                       显示帮助
`;

function fail(message) {
  console.error(`[release:electron] ${message}`);
  process.exit(1);
}

function run(command, args, { env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
    env,
  });

  if (result.status !== 0) {
    fail(`命令执行失败：${command} ${args.join(" ")}`);
  }
}

function runCapture(command, args, { allowFail = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: false,
  });

  if (result.status !== 0 && !allowFail) {
    const stderr = String(result.stderr || "").trim();
    fail(`命令执行失败：${command} ${args.join(" ")}${stderr ? `\n${stderr}` : ""}`);
  }

  return {
    status: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function parseArgs(argv) {
  const options = {
    bump: "",
    version: "",
    localBuild: "all",
    message: "",
    remote: "origin",
    noPush: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--no-push") {
      options.noPush = true;
      continue;
    }

    if (arg === "--bump") {
      if (!next)
        fail("--bump 缺少参数");
      options.bump = String(next).trim();
      i++;
      continue;
    }

    if (arg === "--version") {
      if (!next)
        fail("--version 缺少参数");
      options.version = String(next).trim();
      i++;
      continue;
    }

    if (arg === "--local-build") {
      if (!next)
        fail("--local-build 缺少参数");
      options.localBuild = String(next).trim();
      i++;
      continue;
    }

    if (arg === "--message") {
      if (!next)
        fail("--message 缺少参数");
      options.message = String(next);
      i++;
      continue;
    }

    if (arg === "--remote") {
      if (!next)
        fail("--remote 缺少参数");
      options.remote = String(next).trim();
      i++;
      continue;
    }

    fail(`未知参数：${arg}`);
  }

  return options;
}

function parseSimpleSemver(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(version, bump) {
  const parsed = parseSimpleSemver(version);
  if (!parsed) {
    fail(`当前版本不是 x.y.z 格式：${version}`);
  }

  if (bump === "patch") {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }

  if (bump === "minor") {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }

  if (bump === "major") {
    return `${parsed.major + 1}.0.0`;
  }

  fail(`不支持的 bump 类型：${bump}`);
}

function ensureCleanWorktree() {
  const status = runCapture("git", ["status", "--porcelain"]).stdout.trim();
  if (status) {
    fail("工作区不是干净状态。请先提交或清理当前改动。");
  }
}

function ensureMainBranch() {
  const branch = runCapture("git", ["branch", "--show-current"]).stdout.trim();
  if (branch !== "main") {
    fail(`当前分支是 ${branch || "(unknown)"}，请切换到 main 后重试。`);
  }
}

function ensureTools() {
  const gitCheck = runCapture("git", ["--version"], { allowFail: true });
  if (gitCheck.status !== 0) {
    fail("未检测到 git。");
  }

  const pnpmCheck = runCapture("pnpm", ["--version"], { allowFail: true });
  if (pnpmCheck.status !== 0) {
    fail("未检测到 pnpm。");
  }
}

function updatePackageVersion(nextVersion) {
  const packagePath = resolve(projectRoot, "package.json");
  const raw = readFileSync(packagePath, "utf8");
  const pkg = JSON.parse(raw);
  const currentVersion = String(pkg.version || "").trim();

  if (!currentVersion) {
    fail("package.json 缺少 version 字段。");
  }

  pkg.version = nextVersion;
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return currentVersion;
}

function runLocalBuild(localBuild) {
  if (localBuild === "none") {
    console.log("[release:electron] 跳过本地打包。");
    return;
  }

  if (localBuild !== "all" && localBuild !== "zip" && localBuild !== "nsis") {
    fail(`不支持的 --local-build 值：${localBuild}`);
  }

  if (localBuild === "all" || localBuild === "zip") {
    run("pnpm", ["-s", "electron:build:win:zip"]);
  }
  if (localBuild === "all" || localBuild === "nsis") {
    run("pnpm", ["-s", "electron:build:win:nsis"]);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP.trim());
    return;
  }

  if ((options.bump && options.version) || (!options.bump && !options.version)) {
    fail("请在 --bump 与 --version 中二选一。");
  }

  ensureTools();
  ensureCleanWorktree();
  ensureMainBranch();

  const remote = options.remote || "origin";
  console.log(`[release:electron] 同步远端 ${remote}/main ...`);
  run("git", ["fetch", remote, "main"]);
  run("git", ["pull", "--rebase", remote, "main"]);

  const packagePath = resolve(projectRoot, "package.json");
  const currentPkg = JSON.parse(readFileSync(packagePath, "utf8"));
  const currentVersion = String(currentPkg.version || "").trim();

  let nextVersion = "";
  if (options.version) {
    if (!parseSimpleSemver(options.version)) {
      fail(`--version 必须是 x.y.z 格式，当前值：${options.version}`);
    }
    nextVersion = options.version;
  }
  else {
    nextVersion = bumpVersion(currentVersion, options.bump);
  }

  if (nextVersion === currentVersion) {
    fail(`目标版本与当前版本相同：${currentVersion}`);
  }

  console.log(`[release:electron] 版本更新：${currentVersion} -> ${nextVersion}`);
  updatePackageVersion(nextVersion);

  console.log(`[release:electron] 本地打包模式：${options.localBuild}`);
  runLocalBuild(options.localBuild);

  run("git", ["add", "package.json"]);
  const commitMessage = options.message.trim() || `chore(release): v${nextVersion}`;
  run("git", ["commit", "-m", commitMessage]);

  // 多代理场景下，提交后再次 rebase，避免 push 时被远端先行提交阻塞。
  run("git", ["pull", "--rebase", remote, "main"]);

  if (!options.noPush) {
    run("git", ["push", remote, "main"]);
    console.log("[release:electron] 已推送 main。云端增量发布 workflow 会自动触发。");
  }
  else {
    console.log("[release:electron] 已完成本地提交（未推送）。");
  }

  console.log("[release:electron] 完成。");
}

main();
