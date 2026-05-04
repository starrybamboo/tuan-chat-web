import { describe, expect, it } from "vitest";

import {
  buildOssUploadHeaders,
  IMMUTABLE_UPLOAD_CACHE_CONTROL,
  resolveOssUploadTarget,
} from "./ossUploadTarget";

describe("ossUploadTarget", () => {
  it("优先使用服务端返回的上传头，并补齐 Content-Type", () => {
    const blob = new Blob(["image"], { type: "image/png" });

    const headers = buildOssUploadHeaders(blob, {
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-amz-meta-owner": "tuanchat",
    });

    expect(headers).toEqual({
      "Cache-Control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
      "x-amz-meta-owner": "tuanchat",
      "Content-Type": "image/png",
    });
  });

  it("没有服务端上传头时补齐 immutable 缓存头", () => {
    const blob = new Blob(["audio"], { type: "audio/webm" });

    const headers = buildOssUploadHeaders(blob);

    expect(headers).toEqual({
      "Cache-Control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
      "Content-Type": "audio/webm",
    });
  });

  it("服务端已返回 Content-Type 时不重复追加大小写不同的同名头", () => {
    const blob = new Blob(["image"], { type: "image/png" });

    const headers = buildOssUploadHeaders(blob, {
      "cache-control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
      "content-type": "image/webp",
    });

    expect(headers).toEqual({
      "cache-control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
      "content-type": "image/webp",
    });
  });

  it("开发环境跨源上传会走本地代理并透传签名头", () => {
    const blob = new Blob(["image"], { type: "image/png" });

    const target = resolveOssUploadTarget(
      "https://oss.example.com/avatar/hash_1.png",
      blob,
      { "Cache-Control": IMMUTABLE_UPLOAD_CACHE_CONTROL },
      { isDev: true, currentOrigin: "http://localhost:5177" },
    );

    expect(target).toEqual({
      targetUrl: "/api/oss-upload-proxy",
      viaDevProxy: true,
      headers: {
        "X-TC-OSS-Upload-Url": encodeURIComponent("https://oss.example.com/avatar/hash_1.png"),
        "Cache-Control": IMMUTABLE_UPLOAD_CACHE_CONTROL,
        "Content-Type": "image/png",
      },
    });
  });
});
