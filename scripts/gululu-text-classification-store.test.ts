import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));

async function runStore(args: string[]) {
  const scriptPath = path.join(currentDir, "gululu-text-classification-store.mjs");
  return execFileAsync(process.execPath, [scriptPath, ...args], {
    cwd: path.resolve(currentDir, ".."),
  });
}

describe("gululu-text-classification-store", () => {
  it("保留战斗事件标注字段并写入审阅产物", async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), "gululu-store-battle-"));
    try {
      const partsDir = path.join(tempRoot, "parts");
      const outDir = path.join(tempRoot, "text-classification-manual-v1");
      await mkdir(partsDir, { recursive: true });
      await writeFile(path.join(partsDir, "part-0001_floors-1-1.md"), [
        "## 第1楼",
        "> 时间: 2022-01-22 20:38",
        "",
        "战斗！",
      ].join("\n"), "utf8");

      const inputPath = path.join(tempRoot, "part-0001.classification.json");
      await writeFile(inputPath, JSON.stringify({
        floors: [{
          events: [{
            battleId: "battle-chen-001",
            battlePhase: "start",
            battleTitle: "烈海王 vs 橙",
            kind: "scene",
            performanceUse: "perform",
            summary: "橙战开始。",
            textRef: "战斗！",
          }],
          floor: 1,
          summary: "橙战开始。",
        }],
      }), "utf8");

      await runStore(["put-file", "--root", tempRoot, "--out-dir", outDir, "--input", inputPath]);

      const store = JSON.parse(await readFile(path.join(outDir, "floor-classifications.json"), "utf8"));
      expect(store.floors[0].events[0]).toMatchObject({
        battleId: "battle-chen-001",
        battlePhase: "start",
        battleTitle: "烈海王 vs 橙",
      });

      const review = await readFile(path.join(outDir, "review.md"), "utf8");
      expect(review).toContain("battle-chen-001 / start / 烈海王 vs 橙");
    }
    finally {
      await rm(tempRoot, { force: true, recursive: true });
    }
  });
});
