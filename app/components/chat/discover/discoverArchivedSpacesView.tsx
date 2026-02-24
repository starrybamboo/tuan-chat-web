import type { ApiResultListSpace } from "api/models/ApiResultListSpace";
import type { ApiResultPageBaseRespRepository } from "api/models/ApiResultPageBaseRespRepository";
import type { Repository } from "api/models/Repository";
import type { Space } from "api/models/Space";

import { CompassIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import RepositoryDetailComponent from "@/components/repository/detail/repositoryDetail";

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

function parseRepositoryId(value: string | null): number | null {
  if (!value)
    return null;
  const parsed = Number(value);
  return isValidId(parsed) ? parsed : null;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [expandedRepoIds, setExpandedRepoIds] = useState<number[]>([]);
  const [isRepositoryViewModeOpen, setIsRepositoryViewModeOpen] = useState(false);
  const activeRepositoryId = useMemo(() => parseRepositoryId(searchParams.get("repositoryId")), [searchParams]);

  useEffect(() => {
    if (!activeRepositoryId) {
      setIsRepositoryViewModeOpen(false);
    }
  }, [activeRepositoryId]);

  const openRepositoryInPanel = useCallback((repositoryId: number) => {
    if (!isValidId(repositoryId))
      return;
    const next = new URLSearchParams(searchParams);
    next.set("repositoryId", String(repositoryId));
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const closeRepositoryPanel = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("repositoryId");
    setSearchParams(next);
    setIsRepositoryViewModeOpen(false);
  }, [searchParams, setSearchParams]);

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
    // 兼容当前后端：暂无 listArchivedSpacesMy 接口，先获取当前用户空间再按归档状态筛选。
    queryFn: () => tuanchat.spaceController.getUserSpaces(),
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

  const pageTitle = mode === "my" ? "发现-我的归档" : "发现-广场";
  const sectionTitle = mode === "my" ? "我的归档仓库" : "广场仓库";
  const sectionDescription = mode === "my"
    ? "按仓库聚合展示你归档过的空间，进入详情可继续查看与克隆。"
    : "浏览根仓库并在当前页面直接查看仓库详情。";
  const emptyTitle = mode === "my" ? "暂无归档仓库" : "暂无可发现的仓库";
  const emptyDescription = mode === "my"
    ? "当你在群聊（空间）里执行归档后，会在这里按仓库聚合展示。"
    : "当前没有可展示的根仓库。";

  const isLoading = mode === "square" ? rootRepositoryQuery.isLoading : archivedSpacesQuery.isLoading;
  const isError = mode === "square" ? rootRepositoryQuery.isError : archivedSpacesQuery.isError;
  const refetch = mode === "square" ? rootRepositoryQuery.refetch : archivedSpacesQuery.refetch;
  const shouldShowArchivedList = mode === "my";

  const totalCount = mode === "square"
    ? filteredRootRepositories.length
    : filteredArchivedRepositoryGroups.length;

  const toggleExpandedRepo = (repositoryId: number) => {
    setExpandedRepoIds(prev => (prev.includes(repositoryId)
      ? prev.filter(id => id !== repositoryId)
      : [...prev, repositoryId]));
  };

  const shouldHideRepositoryHeader = Boolean(activeRepositoryId && isRepositoryViewModeOpen);

  return (
    <div className="flex flex-col w-full h-full min-h-0 min-w-0 bg-base-200 text-base-content">
      {!shouldHideRepositoryHeader && (
        <div className="sticky top-0 z-20 bg-base-200 border-t border-b border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4 px-6 h-12">
            {activeRepositoryId
              ? (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={closeRepositoryPanel}
                      >
                        返回发现
                      </button>
                      <div className="min-w-0 text-sm font-bold text-base-content/90 truncate">
                        {`仓库 #${activeRepositoryId}`}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setIsRepositoryViewModeOpen(true)}
                    >
                      查看模组
                    </button>
                  </>
                )
              : (
                  <>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{pageTitle}</div>
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
                  </>
                )}
          </div>
        </div>
      )}

      <div className={shouldHideRepositoryHeader ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-y-auto"}>
        <div className={activeRepositoryId
          ? (isRepositoryViewModeOpen ? "w-full h-full" : "w-full")
          : "mx-auto w-full max-w-6xl px-6 py-6 space-y-6"}
        >
          {activeRepositoryId
            ? (
                <RepositoryDetailComponent
                  repositoryId={activeRepositoryId}
                  onOpenRepository={openRepositoryInPanel}
                  embedded
                  viewModeOpen={isRepositoryViewModeOpen}
                  onViewModeOpenChange={setIsRepositoryViewModeOpen}
                />
              )
            : (
                <>
                  <div className="relative rounded-xl overflow-hidden border border-base-300 bg-info/10">
                    <CompassIcon
                      aria-hidden="true"
                      weight="duotone"
                      className="pointer-events-none absolute -right-24 -top-24 hidden h-88 w-88 text-primary/15 sm:block"
                    />
                    <div className="relative z-10 px-8 py-8 sm:py-10">
                      <div className="text-2xl sm:text-4xl font-extrabold tracking-tight">
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
                      <div className="text-sm font-semibold">{sectionTitle}</div>
                      <div className="mt-1 text-xs text-base-content/60">{sectionDescription}</div>
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
                            role="button"
                            tabIndex={0}
                            className="group rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-info/60"
                            onClick={() => openRepositoryInPanel(repositoryId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openRepositoryInPanel(repositoryId);
                              }
                            }}
                          >
                            <div className="relative aspect-[4/3] bg-base-300 overflow-hidden">
                              <img
                                src={image}
                                alt={String(name)}
                                className="h-full w-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                              <div className="absolute left-3 top-3">
                                <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                                  根仓库
                                </span>
                              </div>

                              <div className="absolute right-3 bottom-3 rounded-md bg-base-100/85 px-2 py-1 text-xs font-semibold text-base-content opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                                点击查看仓库
                              </div>
                            </div>

                            <div className="p-3">
                              <div className="min-w-0">
                                <div className="text-lg font-medium tracking-wide truncate">{name}</div>
                                <div className="mt-1 text-xs text-base-content/70 truncate">
                                  {description || "暂无描述"}
                                </div>
                                <div className="mt-1 text-[10px] text-base-content/50">{`仓库 #${repositoryId}`}</div>
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
                        const latestSpaceId = isValidId(latestSpace?.spaceId) ? latestSpace.spaceId : null;

                        return (
                          <div
                            key={repositoryId}
                            role="button"
                            tabIndex={0}
                            className="group rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-info/60"
                            onClick={() => openRepositoryInPanel(repositoryId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openRepositoryInPanel(repositoryId);
                              }
                            }}
                          >
                            <div className="relative aspect-[4/3] bg-base-300 overflow-hidden">
                              <img
                                src={image}
                                alt={String(name)}
                                className="h-full w-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

                              <div className="absolute left-3 top-3 flex items-center gap-2">
                                <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                                  已归档
                                </span>
                                <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                                  {`版本 ${group.spaces.length}`}
                                </span>
                              </div>

                              <div className="absolute right-3 bottom-3 rounded-md bg-base-100/85 px-2 py-1 text-xs font-semibold text-base-content opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                                点击查看仓库
                              </div>
                            </div>

                            <div className="p-3">
                              <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-lg font-medium tracking-wide truncate">{name}</div>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-outline h-6 min-h-0 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandedRepo(repositoryId);
                                    }}
                                  >
                                    {isExpanded ? "收起归档" : "展开归档"}
                                  </button>
                                </div>
                                {description && (
                                  <div className="mt-1 text-xs text-base-content/70 max-h-8 overflow-hidden">
                                    {description}
                                  </div>
                                )}
                                <div className="mt-1 flex items-center justify-between gap-2">
                                  <div className="text-[11px] text-base-content/55 truncate">
                                    {`最新归档：${latestSpace?.name ?? "未命名空间"}`}
                                  </div>
                                  <div className="text-[10px] text-base-content/50 shrink-0">{`仓库 #${repositoryId}`}</div>
                                </div>
                              </div>

                              {shouldShowArchivedList && isExpanded && (
                                <div className="mt-3 border-t border-base-300 pt-2 space-y-2">
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!latestSpaceId)
                                              return;
                                            navigate(`/chat/${latestSpaceId}`);
                                          }}
                                          disabled={!latestSpaceId}
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
                </>
              )}
        </div>
      </div>
    </div>
  );
}
