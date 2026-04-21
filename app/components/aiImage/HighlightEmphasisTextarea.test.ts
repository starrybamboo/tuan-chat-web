import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HighlightEmphasisTextarea, parseNovelAiSegments } from "@/components/aiImage/HighlightEmphasisTextarea";

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

  it("treats whole-line comments as dedicated comment segments", () => {
    const segments = parseNovelAiSegments("1girl\n// {comment} 1.6::tag::\ncity lights");
    const commentSegment = segments.find(segment => segment.kind === "comment");

    expect(commentSegment).toMatchObject({
      kind: "comment",
      text: "// {comment} 1.6::tag::",
    });
    expect(segments.filter(segment => segment.kind === "numeric-close")).toHaveLength(0);
  });

  it("keeps indented whole-line comments gray as well", () => {
    const segments = parseNovelAiSegments("1girl\n  // [comment]\ncity lights");
    const commentSegment = segments.find(segment => segment.kind === "comment");

    expect(commentSegment).toMatchObject({
      kind: "comment",
      text: "  // [comment]",
    });
  });

  it("keeps highlighted emphasis spans metrics-safe for caret alignment", () => {
    const html = renderToStaticMarkup(
      createElement(HighlightEmphasisTextarea, {
        contentClassName: "content",
        surfaceClassName: "surface",
        value: "{{tag}}, [[tag]], 1.6::tag::, -1.2::tag::",
        readOnly: true,
      }),
    );

    expect(html).not.toContain("font-medium");
    expect(html).not.toContain("font-semibold");
  });

  it("renders whole-line comments with muted comment styling", () => {
    const html = renderToStaticMarkup(
      createElement(HighlightEmphasisTextarea, {
        contentClassName: "content",
        surfaceClassName: "surface",
        value: "1girl\n// muted comment",
        readOnly: true,
      }),
    );

    expect(html).toContain("text-base-content/45");
  });
});
