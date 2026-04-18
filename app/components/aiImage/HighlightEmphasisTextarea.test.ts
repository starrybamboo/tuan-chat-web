import { describe, expect, it } from "vitest";

import { parseNovelAiSegments } from "@/components/aiImage/HighlightEmphasisTextarea";

describe("HighlightEmphasisTextarea", () => {
  it("does not treat trailing digits inside a tag as a new numeric emphasis", () => {
    const segments = parseNovelAiSegments("1.2::tag3::");

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ kind: "syntax", text: "1.2::tag3" });
    expect(segments[1]).toMatchObject({ kind: "numeric-close", text: "::" });
  });

  it("keeps comma-separated digit-ending tags working with the closing marker", () => {
    const segments = parseNovelAiSegments("1.2::tag3,::");

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ kind: "syntax", text: "1.2::tag3," });
    expect(segments[1]).toMatchObject({ kind: "numeric-close", text: "::" });
  });
});
