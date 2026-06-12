import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchRepositoryDetailWithCache,
  repositoryDetailQueryKey,
} from "./repositoryQueryHooks";

const { getRepositoryByIdMock } = vi.hoisted(() => ({
  getRepositoryByIdMock: vi.fn(),
}));

vi.mock("../instance", () => ({
  tuanchat: {
    repositoryController: {
      getById: getRepositoryByIdMock,
    },
  },
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("repository detail cache helpers", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("repositoryDetailQueryKey 统一仓库详情缓存 key", () => {
    expect(repositoryDetailQueryKey(42)).toEqual(["repositoryDetail", 42]);
  });

  it("fetchRepositoryDetailWithCache 会复用 repositoryDetail 缓存项", async () => {
    const queryClient = createQueryClient();
    getRepositoryByIdMock.mockResolvedValue({
      success: true,
      data: {
        repositoryId: 42,
        repositoryName: "缓存仓库",
      },
    });

    await fetchRepositoryDetailWithCache(queryClient, 42);
    await fetchRepositoryDetailWithCache(queryClient, 42);

    expect(getRepositoryByIdMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(repositoryDetailQueryKey(42))).toMatchObject({
      success: true,
      data: {
        repositoryId: 42,
        repositoryName: "缓存仓库",
      },
    });
  });
});
