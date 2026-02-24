import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

const DEFAULT_WEBGAL_TERRE_RELEASE_DIR = resolve(projectRoot, "..", "WebGAL_Terre", "release");
const sourceReleaseDirRaw = String(
  process.env.WEBGAL_TERRE_RELEASE_DIR || DEFAULT_WEBGAL_TERRE_RELEASE_DIR,
).trim();
const sourceReleaseDir = isAbsolute(sourceReleaseDirRaw)
  ? sourceReleaseDirRaw
  : resolve(projectRoot, sourceReleaseDirRaw);

const targetDir = resolve(projectRoot, "extraResources");
const requiredExeName = "WebGAL_Terre.exe";
const runtimeIgnoredDirs = [
  "public/games",
  "Exported_Games",
];

function hasWebGALTerreExe(dir) {
  return existsSync(resolve(dir, requiredExeName));
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function clearTargetDir(dir) {
  if (!existsSync(dir))
    return;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase() === "readme.md")
      continue;
    rmSync(resolve(dir, entry.name), { recursive: true, force: true });
  }
}

function copyReleaseContents(srcDir, destDir) {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    cpSync(
      resolve(srcDir, entry.name),
      resolve(destDir, entry.name),
      { recursive: true, force: true },
    );
  }
}

function pruneRuntimeUserContent(dir) {
  for (const relPath of runtimeIgnoredDirs) {
    const absolutePath = resolve(dir, relPath);
    rmSync(absolutePath, { recursive: true, force: true });
  }
}

function syncWebGALTerreRelease() {
  ensureDir(targetDir);

  const normalizedSourceDir = resolve(sourceReleaseDir).toLowerCase();
  const normalizedTargetDir = resolve(targetDir).toLowerCase();
  if (normalizedSourceDir === normalizedTargetDir) {
    pruneRuntimeUserContent(targetDir);
    console.warn(`[electron:prepare:resources] source 与 target 相同，跳过同步：
  source: ${sourceReleaseDir}
  target: ${targetDir}`);
    return;
  }

  const sourceExists = existsSync(sourceReleaseDir);
  const sourceHasExe = sourceExists && hasWebGALTerreExe(sourceReleaseDir);

  if (!sourceHasExe) {
    if (hasWebGALTerreExe(targetDir)) {
      pruneRuntimeUserContent(targetDir);
      console.warn(`[electron:prepare:resources] 未找到可用的 WebGAL_Terre release，沿用现有 extraResources：
  source: ${sourceReleaseDir}
  target: ${targetDir}`);
      return;
    }

    throw new Error(`[electron:prepare:resources] 未找到 WebGAL_Terre 发行目录或缺少 ${requiredExeName}。
请先构建 WebGAL_Terre 到默认路径：
  ${DEFAULT_WEBGAL_TERRE_RELEASE_DIR}
或设置环境变量 WEBGAL_TERRE_RELEASE_DIR 指向正确目录。`);
  }

  clearTargetDir(targetDir);
  copyReleaseContents(sourceReleaseDir, targetDir);
  pruneRuntimeUserContent(targetDir);

  if (!hasWebGALTerreExe(targetDir)) {
    throw new Error(`[electron:prepare:resources] 同步完成但目标目录缺少 ${requiredExeName}：
  ${targetDir}`);
  }

  console.log(`[electron:prepare:resources] 已同步 WebGAL_Terre 资源：
  source: ${sourceReleaseDir}
  target: ${targetDir}`);
}

syncWebGALTerreRelease();
