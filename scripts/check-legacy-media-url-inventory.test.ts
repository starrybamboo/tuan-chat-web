import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inventoryPath = resolve(projectRoot, "docs/media-legacy-url-inventory.json");
const scriptPath = resolve(projectRoot, "scripts/check-legacy-media-url-inventory.mjs");

describe("legacy media URL inventory guard", () => {
  it("清单中的字段都有分类、读写策略和清退条件", () => {
    const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
    const classifications = new Set(Object.keys(inventory.classifications));

    expect(inventory.fields.length).toBeGreaterThan(10);
    for (const entry of inventory.fields) {
      expect(entry.field).toEqual(expect.any(String));
      expect(classifications.has(entry.classification)).toBe(true);
      expect(entry.readPolicy).toEqual(expect.any(String));
      expect(entry.writePolicy).toEqual(expect.any(String));
      expect(entry.retirementCondition).toEqual(expect.any(String));
    }
  });

  it("仓库中疑似长期媒体 URL 字段都已进入清单", () => {
    const output = execFileSync(process.execPath, [scriptPath, "--json"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const report = JSON.parse(output);

    expect(report.validationErrors).toEqual([]);
    expect(report.missing).toEqual([]);
    expect(report.checkedFields).toBeGreaterThan(0);
    expect(report.classified).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceKind: "sql", field: "avatarUrl" }),
        expect.objectContaining({ sourceKind: "openapi", field: "imageUrl" }),
      ]),
    );
  });
});
