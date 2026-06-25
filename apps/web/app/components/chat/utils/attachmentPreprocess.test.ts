import { vi } from "vitest";

import { preheatChatMediaPreprocess } from "./attachmentPreprocess";

const mocks = vi.hoisted(() => ({
  compressImageMock: vi.fn<(...args: any[]) => any>(),
  preprocessVideoForUploadMock: vi.fn<(...args: any[]) => any>(),
  preprocessAudioForUploadMock: vi.fn<(...args: any[]) => any>(),
}));

vi.mock("@/utils/media/imgCompressUtils", () => ({
  compressImage: mocks.compressImageMock,
  MEDIA_COMPRESSION_PROFILES: {
    image: {
      low: { low: true },
      medium: { medium: true },
    },
  },
}));

vi.mock("@/utils/media/UploadUtils", () => ({
  UploadUtils: class {
    preprocessVideoForUpload = mocks.preprocessVideoForUploadMock;
    preprocessAudioForUpload = mocks.preprocessAudioForUploadMock;
  },
}));

describe("attachmentPreprocess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("会预热图片 low 与 medium 压缩", async () => {
    const image = new File([new Uint8Array(8)], "drag.png", { type: "image/png" });

    preheatChatMediaPreprocess({ imageFiles: [image] });
    await Promise.resolve();

    expect(mocks.compressImageMock).toHaveBeenCalledTimes(2);
    expect(mocks.compressImageMock).toHaveBeenNthCalledWith(1, image, { low: true });
    expect(mocks.compressImageMock).toHaveBeenNthCalledWith(2, image, { medium: true });
  });
});
