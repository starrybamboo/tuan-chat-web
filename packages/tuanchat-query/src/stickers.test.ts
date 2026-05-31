import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { assertStickerApiResult } from "./stickers";

describe("stickers", () => {
  it("会把 success=false 的表情接口响应转成错误", () => {
    expect(() => assertStickerApiResult({
      success: false,
      errMsg: "文件不属于表情包场景",
    }, "创建表情包失败。")).toThrow("文件不属于表情包场景");
  });

  it("会保留 success=true 的表情接口响应", () => {
    const result = {
      success: true,
      data: 7,
    };

    expect(assertStickerApiResult(result, "创建表情包失败。")).toBe(result);
  });

  it("query 收到 success=false 时进入 error 状态且不缓存成功数据", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await expect(queryClient.fetchQuery({
      queryKey: ["stickers", "failure"],
      queryFn: async () => assertStickerApiResult({
        success: false,
        errMsg: "读取表情失败",
      }, "获取表情包列表失败。"),
    })).rejects.toThrow("读取表情失败");

    expect(queryClient.getQueryState(["stickers", "failure"])?.status).toBe("error");
    expect(queryClient.getQueryData(["stickers", "failure"])).toBeUndefined();
  });

  it("mutation 收到 success=false 时不执行成功副作用", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    const onSuccess = vi.fn();
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => assertStickerApiResult({
        success: false,
        errMsg: "创建表情失败",
      }, "创建表情包失败。"),
      onSuccess,
    });

    await expect(mutation.execute(undefined)).rejects.toThrow("创建表情失败");

    expect(mutation.state.status).toBe("error");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
