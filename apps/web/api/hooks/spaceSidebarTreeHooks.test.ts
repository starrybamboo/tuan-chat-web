import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApiResultSpaceSidebarTreeResponse } from "@tuanchat/openapi-client/models/ApiResultSpaceSidebarTreeResponse";
import {
  buildOptimisticSpaceSidebarTreeResponse,
  invalidateSettledSpaceSidebarTreeQueryCache,
  isOptimisticSpaceSidebarTreeResponse,
  isSameSpaceSidebarTreeSnapshot,
  optimisticSetSpaceSidebarTreeQueryCache,
  rollbackSpaceSidebarTreeQueryCache,
  spaceSidebarTreeQueryKey,
  settleSpaceSidebarTreeQueryCache,
  syncSpaceSidebarTreeSetRequestVersion,
} from "./spaceSidebarTreeHooks";

describe("space sidebar tree cache helpers", () => {
  it("spaceSidebarTreeQueryKey 统一侧边栏树缓存 key", () => {
    expect(spaceSidebarTreeQueryKey(10788)).toEqual(["getSpaceSidebarTree", 10788]);
  });

  it("会基于已有服务端缓存构造乐观侧边栏树响应", () => {
    const previous: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 7,
        version: 4,
        treeJson: "{\"nodes\":[]}",
      },
    };

    const optimistic = buildOptimisticSpaceSidebarTreeResponse(previous, {
      spaceId: 7,
      expectedVersion: 4,
      treeJson: "{\"nodes\":[{\"id\":\"room-1\"}]}",
    });

    expect(optimistic).toMatchObject({
      success: true,
      errCode: undefined,
      errMsg: undefined,
      data: {
        spaceId: 7,
        version: 5,
        treeJson: "{\"nodes\":[{\"id\":\"room-1\"}]}",
      },
    });
    expect(isOptimisticSpaceSidebarTreeResponse(optimistic)).toBe(true);
  });

  it("没有缓存时也会创建可立即渲染的乐观响应", () => {
    const optimistic = buildOptimisticSpaceSidebarTreeResponse(undefined, {
      spaceId: 9,
      expectedVersion: 0,
      treeJson: "{\"categories\":[]}",
    });

    expect(optimistic).toMatchObject({
      success: true,
      errCode: undefined,
      errMsg: undefined,
      data: {
        spaceId: 9,
        version: 1,
        treeJson: "{\"categories\":[]}",
      },
    });
    expect(isOptimisticSpaceSidebarTreeResponse(optimistic)).toBe(true);
  });

  it("乐观版本号不会低于请求携带的 expectedVersion 后续版本", () => {
    const previous: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 11,
        version: 3,
        treeJson: "{}",
      },
    };

    expect(buildOptimisticSpaceSidebarTreeResponse(previous, {
      spaceId: 11,
      expectedVersion: 8,
      treeJson: "{\"next\":true}",
    }).data?.version).toBe(9);
  });

  it("保存请求会基于当前缓存版本修正 expectedVersion", () => {
    const previous: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 11,
        version: 8,
        treeJson: "{}",
      },
    };

    expect(syncSpaceSidebarTreeSetRequestVersion(previous, {
      spaceId: 11,
      expectedVersion: 3,
      treeJson: "{\"next\":true}",
    })).toEqual({
      spaceId: 11,
      expectedVersion: 8,
      treeJson: "{\"next\":true}",
    });
  });

  it("保存请求不会降低调用方已携带的较新 expectedVersion", () => {
    const previous: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 11,
        version: 3,
        treeJson: "{}",
      },
    };

    expect(syncSpaceSidebarTreeSetRequestVersion(previous, {
      spaceId: 11,
      expectedVersion: 8,
      treeJson: "{\"next\":true}",
    })).toEqual({
      spaceId: 11,
      expectedVersion: 8,
      treeJson: "{\"next\":true}",
    });
  });

  it("乐观保存会先写入缓存并在失败时回滚", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(spaceSidebarTreeQueryKey(15), {
      success: true,
      data: {
        spaceId: 15,
        version: 2,
        treeJson: "{\"before\":true}",
      },
    });

    const variables = {
      spaceId: 15,
      expectedVersion: 1,
      treeJson: "{\"after\":true}",
    };
    const context = await optimisticSetSpaceSidebarTreeQueryCache(queryClient, variables);

    expect(variables.expectedVersion).toBe(2);
    expect(queryClient.getQueryData<any>(spaceSidebarTreeQueryKey(15))).toMatchObject({
      data: {
        spaceId: 15,
        version: 3,
        treeJson: "{\"after\":true}",
      },
    });

    rollbackSpaceSidebarTreeQueryCache(queryClient, variables, context);

    expect(queryClient.getQueryData<any>(spaceSidebarTreeQueryKey(15))).toMatchObject({
      data: {
        spaceId: 15,
        version: 2,
        treeJson: "{\"before\":true}",
      },
    });
  });

  it("成功返回会用服务端响应替换当前乐观缓存", async () => {
    const queryClient = new QueryClient();
    const variables = {
      spaceId: 16,
      expectedVersion: 4,
      treeJson: "{\"next\":true}",
    };
    const context = await optimisticSetSpaceSidebarTreeQueryCache(queryClient, variables);

    settleSpaceSidebarTreeQueryCache(queryClient, {
      success: true,
      data: {
        spaceId: 16,
        version: 9,
        treeJson: "{\"server\":true}",
      },
    }, variables, context);

    expect(queryClient.getQueryData<any>(spaceSidebarTreeQueryKey(16))).toMatchObject({
      data: {
        spaceId: 16,
        version: 9,
        treeJson: "{\"server\":true}",
      },
    });
  });

  it("settled 会失效当前侧边栏树以校准服务端状态", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const variables = {
      spaceId: 17,
      expectedVersion: 0,
      treeJson: "{\"next\":true}",
    };
    const context = await optimisticSetSpaceSidebarTreeQueryCache(queryClient, variables);

    settleSpaceSidebarTreeQueryCache(queryClient, {
      success: true,
      data: {
        spaceId: 17,
        version: 1,
        treeJson: "{\"server\":true}",
      },
    }, variables, context);
    invalidateSettledSpaceSidebarTreeQueryCache(queryClient, variables, context);

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: spaceSidebarTreeQueryKey(17) });
  });

  it("旧保存 settled 时不会失效后续保存写入的新乐观树", async () => {
    const queryClient = new QueryClient();
    const firstVariables = {
      spaceId: 18,
      expectedVersion: 0,
      treeJson: "{\"first\":true}",
    };
    const firstContext = await optimisticSetSpaceSidebarTreeQueryCache(queryClient, firstVariables);
    await optimisticSetSpaceSidebarTreeQueryCache(queryClient, {
      spaceId: 18,
      expectedVersion: 0,
      treeJson: "{\"second\":true}",
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

    rollbackSpaceSidebarTreeQueryCache(queryClient, firstVariables, firstContext);
    invalidateSettledSpaceSidebarTreeQueryCache(queryClient, firstVariables, firstContext);

    expect(queryClient.getQueryData<any>(spaceSidebarTreeQueryKey(18))).toMatchObject({
      data: {
        treeJson: "{\"second\":true}",
      },
    });
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("会清掉旧失败态，避免乐观缓存继续表现为接口失败", () => {
    const previous: ApiResultSpaceSidebarTreeResponse = {
      success: false,
      errCode: 409,
      errMsg: "版本冲突",
      data: {
        spaceId: 12,
        version: 1,
        treeJson: "{}",
      },
    };

    const optimistic = buildOptimisticSpaceSidebarTreeResponse(previous, {
      spaceId: 12,
      expectedVersion: 1,
      treeJson: "{\"ok\":true}",
    });

    expect(optimistic).toMatchObject({
      success: true,
      data: {
        spaceId: 12,
        version: 2,
        treeJson: "{\"ok\":true}",
      },
    });
    expect(optimistic.errCode).toBeUndefined();
    expect(optimistic.errMsg).toBeUndefined();
    expect(isOptimisticSpaceSidebarTreeResponse(optimistic)).toBe(true);
  });

  it("普通服务端快照不会被识别为乐观侧边栏树", () => {
    const serverSnapshot: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 7,
        version: 2,
        treeJson: "{}",
      },
    };

    expect(isOptimisticSpaceSidebarTreeResponse(serverSnapshot)).toBe(false);
  });

  it("快照匹配会同时比较空间、版本和树内容", () => {
    const snapshot: ApiResultSpaceSidebarTreeResponse = {
      success: true,
      data: {
        spaceId: 12,
        version: 2,
        treeJson: "{\"ok\":true}",
      },
    };

    expect(isSameSpaceSidebarTreeSnapshot(snapshot, snapshot)).toBe(true);
    expect(isSameSpaceSidebarTreeSnapshot({
      success: true,
      data: {
        spaceId: 12,
        version: 3,
        treeJson: "{\"ok\":true}",
      },
    }, snapshot)).toBe(false);
    expect(isSameSpaceSidebarTreeSnapshot({
      success: true,
      data: {
        spaceId: 13,
        version: 2,
        treeJson: "{\"ok\":true}",
      },
    }, snapshot)).toBe(false);
  });
});
