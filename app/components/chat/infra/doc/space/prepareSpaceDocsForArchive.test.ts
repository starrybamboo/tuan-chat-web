import { describe, expect, it } from "vitest";

import { prepareSpaceDocsForArchive } from "./prepareSpaceDocsForArchive";

describe("prepareSpaceDocsForArchive", () => {
  it("message-stream 文档归档前不再执行远端快照同步", async () => {
    await expect(prepareSpaceDocsForArchive(99)).resolves.toBeUndefined();
  });
});
