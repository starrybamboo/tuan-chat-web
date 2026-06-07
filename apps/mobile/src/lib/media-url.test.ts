import { describe, expect, it } from "vitest";

import { avatarThumbUrl, mediaFileUrl } from "./media-url";

describe("mobile media-url", () => {
  it("图片高档位请求使用真实 high 档位", () => {
    expect(mediaFileUrl(45, "image", "high")).toBe("https://media.tuan.chat/media/v1/files/045/45/image/high.webp");
    expect(mediaFileUrl(45, "image", "original")).toBe("https://media.tuan.chat/media/v1/files/045/45/original");
  });

  it("音频和视频展示档位会回退到 low，显式 original 保留原文件", () => {
    expect(mediaFileUrl(12, "audio", "high")).toBe("https://media.tuan.chat/media/v1/files/012/12/audio/low.webm");
    expect(mediaFileUrl(12, "audio", "original")).toBe("https://media.tuan.chat/media/v1/files/012/12/original");
    expect(mediaFileUrl(34, "video", "medium")).toBe("https://media.tuan.chat/media/v1/files/034/34/video/low.webm");
  });

  it("头像缩略图继续使用 low 档位", () => {
    expect(avatarThumbUrl(7)).toBe("https://media.tuan.chat/media/v1/files/007/7/image/low.webp");
    expect(avatarThumbUrl(null)).toBeUndefined();
  });
});
