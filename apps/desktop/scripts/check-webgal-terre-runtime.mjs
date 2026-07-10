import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const workspaceRoot = resolve(projectRoot, "..", "..", "..");
const defaultReleaseDir = resolve(workspaceRoot, "WebGAL_Terre", "release", "tuanchat-runtime");
const releaseDirRaw = String(process.env.WEBGAL_TERRE_RELEASE_DIR || defaultReleaseDir).trim();
const releaseDir = isAbsolute(releaseDirRaw) ? releaseDirRaw : resolve(projectRoot, releaseDirRaw);
const webgalExeCandidates = ["WebGAL_Terre.exe", "WebGAL_Teree.exe"];

function findExecutable(dir) {
  for (const exeName of webgalExeCandidates) {
    const absolutePath = resolve(dir, exeName);
    if (existsSync(absolutePath)) {
      return { absolutePath, exeName };
    }
  }

  return null;
}

const executable = findExecutable(releaseDir);
if (!executable) {
  throw new Error(`[electron:check:webgal] 未找到 WebGAL_Terre 发行目录或缺少可执行文件（${webgalExeCandidates.join(" / ")}）。
请先构建本地 WebGAL_Terre，或设置 WEBGAL_TERRE_RELEASE_DIR 指向发行目录：
  ${releaseDir}`);
}

console.log(`[electron:check:webgal] 已找到 WebGAL_Terre 运行时：
  source: ${releaseDir}
  executable: ${executable.exeName}`);
