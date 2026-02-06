import type { ApiResultListSpace } from "api/models/ApiResultListSpace";
import type { ApiResultPageBaseRespRepository } from "api/models/ApiResultPageBaseRespRepository";
import type { Repository } from "api/models/Repository";
import type { Space } from "api/models/Space";

import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

type DiscoverArchivedSpacesMode = "square" | "my";

interface DiscoverArchivedSpacesViewProps {
  mode: DiscoverArchivedSpacesMode;
}

const DEFAULT_REPOSITORY_IMAGE = "/repositoryDefaultImage.webp";
const ROOT_REPOSITORY_PAGE_SIZE = 60;

function toEpochMs(value?: string) {
  if (!value)
    return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeText(value?: string) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidId(value?: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRootRepository(repository: Repository) {
  const id = repository.repositoryId;
  if (!isValidId(id))
    return false;
  const rootId = repository.rootRepositoryId;
  if (isValidId(rootId))
    return rootId === id;
  const parentId = repository.parentRepositoryId;
  return !isValidId(parentId);
}

function toSpaces(result?: ApiResultListSpace): Space[] {
  const data = (result as any)?.data;
  return Array.isArray(data) ? data as Space[] : [];
}

function toRepositories(result?: ApiResultPageBaseRespRepository): Repository[] {
  const data = result?.data?.list;
  return Array.isArray(data) ? data as Repository[] : [];
}

interface ArchivedRepositoryGroup {
  repositoryId: number;
  repository?: Repository;
  latestSpace: Space;
  spaces: Space[];
}

export default function DiscoverArchivedSpacesView({ mode }: DiscoverArchivedSpacesViewProps) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [expandedRepoIds, setExpandedRepoIds] = useState<number[]>([]);

  const rootRepositoryQuery = useQuery({
    queryKey: ["discoverRootRepositories"],
    queryFn: () => tuanchat.repositoryController.page({
      pageNo: 1,
      pageSize: ROOT_REPOSITORY_PAGE_SIZE,
    }),
    enabled: mode === "square",
    staleTime: 300000,
  });

  const archivedSpacesQuery = useQuery({
    queryKey: ["discoverArchivedSpaces", mode],
    queryFn: () => tuanchat.spaceController.listArchivedSpacesMy(),
    enabled: mode === "my",
    staleTime: 30000,
    retry: 0,
  });

  const archivedSpaces = useMemo(() => {
    const list = toSpaces(archivedSpacesQuery.data)
      .filter(space => space?.status === 2)
      .filter((space) => {
        const repoId = space?.repositoryId;
        return isValidId(repoId);
      });

    list.sort((a, b) => {
      const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
      const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
      return bt - at;
    });

    return list;
  }, [archivedSpacesQuery.data]);

  const archivedRepositoryIds = useMemo(() => {
    const ids = new Set<number>();
    for (const space of archivedSpaces) {
      const repoId = space?.repositoryId;
      if (isValidId(repoId))
        ids.add(repoId);
    }
    return Array.from(ids).sort((a, b) => a - b);
  }, [archivedSpaces]);

  // 归档列表只有 repositoryId，需要补仓库信息。
  const archivedRepositoryQuery = useQuery({
    queryKey: ["discoverRepositoriesByIds", archivedRepositoryIds],
    queryFn: async () => {
      const entries = await Promise.all(
        archivedRepositoryIds.map(async (id) => {
          try {
            const res = await tuanchat.repositoryController.getById(id);
            return res?.data ? [id, res.data] as const : null;
          }
          catch {
            return null;
          }
        }),
      );

      const map: Record<number, Repository> = {};
      for (const entry of entries) {
        if (entry) {
          const [id, repo] = entry;
          map[id] = repo;
        }
      }
      return map;
    },
    enabled: mode === "my" && archivedRepositoryIds.length > 0,
    staleTime: 300000,
  });

  // 按仓库聚合归档空间，取最新版本作为卡片主信息。
  const archivedRepositoryGroups = useMemo(() => {
    const byRepository = new Map<number, Space[]>();
    for (const space of archivedSpaces) {
      const repoId = space?.repositoryId;
      if (!isValidId(repoId))
        continue;
      const bucket = byRepository.get(repoId) ?? [];
      bucket.push(space);
      byRepository.set(repoId, bucket);
    }

    const repositoryMap = archivedRepositoryQuery.data ?? {};
    const groups: ArchivedRepositoryGroup[] = [];

    for (const [repositoryId, spaces] of byRepository.entries()) {
      spaces.sort((a, b) => {
        const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
        const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
        return bt - at;
      });

      const latestSpace = spaces[0];
      if (!latestSpace)
        continue;

      groups.push({
        repositoryId,
        repository: repositoryMap[repositoryId],
        latestSpace,
        spaces,
      });
    }

    groups.sort((a, b) => {
      const at = toEpochMs(a.latestSpace.updateTime) || toEpochMs(a.latestSpace.createTime);
      const bt = toEpochMs(b.latestSpace.updateTime) || toEpochMs(b.latestSpace.createTime);
      return bt - at;
    });

    return groups;
  }, [archivedSpaces, archivedRepositoryQuery.data]);

  const rootRepositories = useMemo(() => {
    const list = toRepositories(rootRepositoryQuery.data)
      .filter(isRootRepository)
      .filter(repo => isValidId(repo.repositoryId));

    list.sort((a, b) => {
      const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
      const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
      return bt - at;
    });

    return list;
  }, [rootRepositoryQuery.data]);

  const filteredRootRepositories = useMemo(() => {
    const q = normalizeText(keyword);
    if (!q)
      return rootRepositories;

    return rootRepositories.filter((repo) => {
      const name = normalizeText(repo?.repositoryName);
      const desc = normalizeText(repo?.description);
      return name.includes(q) || desc.includes(q);
    });
  }, [keyword, rootRepositories]);

  const filteredArchivedRepositoryGroups = useMemo(() => {
    const q = normalizeText(keyword);
    if (!q)
      return archivedRepositoryGroups;

    return archivedRepositoryGroups.filter((group) => {
      const name = normalizeText(group.repository?.repositoryName ?? group.latestSpace?.name);
      const desc = normalizeText(group.repository?.description ?? group.latestSpace?.description);
      return name.includes(q) || desc.includes(q);
    });
  }, [archivedRepositoryGroups, keyword]);

  const headerTitle = mode === "my" ? "我的归档仓库" : "仓库广场";
  const headerDescription = mode === "my"
    ? "这里展示你归档过的仓库，按仓库聚合并展示最新归档版本。"
    : "这里展示所有根仓库，进入详情后可查看 fork 列表。";
  const emptyTitle = mode === "my" ? "暂无归档仓库" : "暂无可发现的仓库";
  const emptyDescription = mode === "my"
    ? "当你在群聊（空间）里执行归档后，会在这里按仓库聚合展示。"
    : "当前没有可展示的根仓库。";

  const shouldShowArchivedList = mode === "my";
  const isLoading = mode === "square" ? rootRepositoryQuery.isLoading : archivedSpacesQuery.isLoading;
  const isError = mode === "square" ? rootRepositoryQuery.isError : archivedSpacesQuery.isError;
  const refetch = mode === "square" ? rootRepositoryQuery.refetch : archivedSpacesQuery.refetch;

  const totalCount = mode === "square"
    ? filteredRootRepositories.length
    : filteredArchivedRepositoryGroups.length;

  const toggleExpandedRepo = (repositoryId: number) => {
    setExpandedRepoIds(prev => (prev.includes(repositoryId)
      ? prev.filter(id => id !== repositoryId)
      : [...prev, repositoryId]));
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0 min-w-0 bg-base-200 text-base-content">
      <div className="sticky top-0 z-20 bg-base-200/90 backdrop-blur border-b border-base-300">
        <div className="flex items-center justify-between gap-4 px-6 h-12">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-sm font-semibold truncate">发现</div>
            <div className="hidden sm:flex items-center gap-1 text-sm">
              <Link
                to="/chat/discover"
                className={`px-3 py-1.5 rounded-md transition-colors ${mode === "square" ? "bg-base-300 text-base-content" : "text-base-content/70 hover:text-base-content hover:bg-base-300/60"}`}
              >
                广场
              </Link>
              <Link
                to="/chat/discover/my"
                className={`px-3 py-1.5 rounded-md transition-colors ${mode === "my" ? "bg-base-300 text-base-content" : "text-base-content/70 hover:text-base-content hover:bg-base-300/60"}`}
              >
                我的归档
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-[360px]">
            <input
              className="input input-sm input-bordered w-full rounded-full"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={mode === "my" ? "搜索我的归档仓库" : "搜索仓库"}
              aria-label={mode === "my" ? "搜索我的归档仓库" : "搜索仓库"}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 space-y-6">
          <div className="rounded-xl overflow-hidden border border-base-300 bg-gradient-to-r from-primary/25 via-secondary/10 to-accent/25">
            <div className="px-8 py-10 sm:py-14">
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                {mode === "my" ? "这里是你的归档仓库" : "探索可发现的仓库"}
              </div>
              <div className="mt-3 text-sm sm:text-base text-base-content/70 max-w-2xl">
                {mode === "my"
                  ? "这里汇总你归档过的空间对应仓库，方便按仓库回看。"
                  : "浏览根仓库，进入详情后可查看 fork 列表或进一步操作。"}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{headerTitle}</div>
              <div className="mt-1 text-xs text-base-content/60">{headerDescription}</div>
            </div>
            <div className="text-xs text-base-content/60">{`仓库数量 ${totalCount}`}</div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <div key={n} className="h-56 rounded-xl bg-base-300/50 animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-4">
              <div className="text-sm font-semibold">
                {mode === "my" ? "暂时无法加载我的归档仓库" : "暂时无法加载仓库广场"}
              </div>
              <div className="mt-1 text-xs text-base-content/60">
                请确认后端已提供对应接口，并且当前账号已登录。
              </div>
              <div className="mt-3 flex justify-end">
                <button className="btn btn-sm btn-outline" type="button" onClick={() => refetch()}>
                  重试
                </button>
              </div>
            </div>
          )}

          {!isLoading && !isError && totalCount === 0 && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-6">
              <div className="text-base font-semibold">{emptyTitle}</div>
              <div className="mt-2 text-sm text-base-content/60">{emptyDescription}</div>
            </div>
          )}

          {!isLoading && !isError && mode === "square" && filteredRootRepositories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRootRepositories.map((repository) => {
                const repositoryId = repository?.repositoryId ?? -1;
                const name = repository?.repositoryName ?? `仓库 #${repositoryId}`;
                const description = String(repository?.description ?? "").trim();
                const image = repository?.image ?? DEFAULT_REPOSITORY_IMAGE;

                return (
                  <div
                    key={repositoryId}
                    className="group rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-28 bg-base-300">
                      <img
                        src={image}
                        alt={String(name)}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent" />

                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                          根仓库
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{name}</div>
                          {description && (
                            <div className="mt-1 text-xs text-base-content/60 max-h-9 overflow-hidden">
                              {description}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-base-content/50 shrink-0">{`#${repositoryId}`}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/repository/detail/${repositoryId}`)}
                        >
                          查看仓库
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isLoading && !isError && mode === "my" && filteredArchivedRepositoryGroups.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredArchivedRepositoryGroups.map((group) => {
                const repositoryId = group.repositoryId;
                const repository = group.repository;
                const name = repository?.repositoryName ?? group.latestSpace?.name ?? `仓库 #${repositoryId}`;
                const description = String(repository?.description ?? group.latestSpace?.description ?? "").trim();
                const image = repository?.image ?? group.latestSpace?.avatar ?? DEFAULT_REPOSITORY_IMAGE;
                const latestSpace = group.latestSpace;
                const isExpanded = expandedRepoIds.includes(repositoryId);

                return (
                  <div
                    key={repositoryId}
                    className="group rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-28 bg-base-300">
                      <img
                        src={image}
                        alt={String(name)}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent" />

                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                          已归档
                        </span>
                        <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                          {`版本 ${group.spaces.length}`}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{name}</div>
                          {description && (
                            <div className="mt-1 text-xs text-base-content/60 max-h-9 overflow-hidden">
                              {description}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-base-content/50">
                            {`最新归档：${latestSpace?.name ?? "未命名空间"}`}
                          </div>
                        </div>
                        <div className="text-[11px] text-base-content/50 shrink-0">{`#${repositoryId}`}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/repository/detail/${repositoryId}`)}
                        >
                          查看仓库
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => toggleExpandedRepo(repositoryId)}
                        >
                          {isExpanded ? "收起归档" : "展开归档"}
                        </button>
                      </div>

                      {shouldShowArchivedList && isExpanded && (
                        <div className="mt-4 border-t border-base-300 pt-3 space-y-2">
                          {group.spaces.map((space) => {
                            const spaceId = space?.spaceId ?? -1;
                            const spaceName = space?.name ?? `空间 #${spaceId}`;
                            const timestamp = space?.updateTime ?? space?.createTime;

                            return (
                              <div key={spaceId} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate">{spaceName}</div>
                                  {timestamp && (
                                    <div className="text-[11px] text-base-content/50">
                                      {`归档时间：${new Date(timestamp).toLocaleString("zh-CN")}`}
                                    </div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-outline"
                                  onClick={() => navigate(`/chat/${spaceId}`)}
                                >
                                  打开归档
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
