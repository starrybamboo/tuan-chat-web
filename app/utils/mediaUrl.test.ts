import { describe, expect, it } from "vitest";

import { avatarThumbUrl, mediaShard, mediaUrl } from "./mediaUrl";

describe("mediaUrl", () => {
  it("根据 fileId 推导分片路径和图片三档 URL", () => {
    expect(mediaShard(1001)).toBe("001");
    expect(mediaUrl(1001, "image", "low")).toBe("/media/v1/files/001/1001/image/low.webp");
    expect(mediaUrl("202", "image", "original")).toBe("/media/v1/files/202/202/original");
    expect(avatarThumbUrl(7)).toBe("/media/v1/files/007/7/image/low.webp");
  });
});
