import { describe, expect, it } from "vitest";

import type { ApiResultSpaceSidebarTreeResponse } from "@tuanchat/openapi-client/models/ApiResultSpaceSidebarTreeResponse";
import {
  buildOptimisticSpaceSidebarTreeResponse,
  isSameSpaceSidebarTreeSnapshot,
  spaceSidebarTreeQueryKey,
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

    expect(buildOptimisticSpaceSidebarTreeResponse(previous, {
      spaceId: 7,
      expectedVersion: 4,
      treeJson: "{\"nodes\":[{\"id\":\"room-1\"}]}",
    })).toEqual({
      success: true,
      errCode: undefined,
      errMsg: undefined,
      data: {
        spaceId: 7,
        version: 5,
        treeJson: "{\"nodes\":[{\"id\":\"room-1\"}]}",
      },
    });
  });

  it("没有缓存时也会创建可立即渲染的乐观响应", () => {
    expect(buildOptimisticSpaceSidebarTreeResponse(undefined, {
      spaceId: 9,
      expectedVersion: 0,
      treeJson: "{\"categories\":[]}",
    })).toEqual({
      success: true,
      errCode: undefined,
      errMsg: undefined,
      data: {
        spaceId: 9,
        version: 1,
        treeJson: "{\"categories\":[]}",
      },
    });
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
