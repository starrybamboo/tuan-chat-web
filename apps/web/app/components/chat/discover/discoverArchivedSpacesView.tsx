import type { ApiResultListSpace } from "@tuanchat/openapi-client/models/ApiResultListSpace";
import type { ApiResultPageBaseRespRepository } from "@tuanchat/openapi-client/models/ApiResultPageBaseRespRepository";
import type { Repository } from "@tuanchat/openapi-client/models/Repository";
import type { Space } from "@tuanchat/openapi-client/models/Space";

import { ArrowLeftIcon, CompassIcon, MagnifyingGlassIcon, PackageIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import RepositoryDetailComponent from "@/components/repository/detail/repositoryDetail";
import { ContentCard } from "@/components/repository/home/RepositoryHome";
import { imageMediumUrl } from "@/utils/mediaUrl";
import { appendPathQuery } from "@/utils/pathQuery";
import { useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { tuanchat } from "api/instance";

type DiscoverArchivedSpacesMode = "square" | "my";

type DiscoverArchivedSpacesViewProps = {
  mode: DiscoverArchivedSpacesMode;
}

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

function formatDateLabel(value?: string) {
  if (!value)
    return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp))
    return null;
  return new Date(timestamp).toLocaleDateString("zh-CN");
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

type ArchivedRepositoryGroup = {
  repositoryId: number;
  repository?: Repository;
  latestSpace: Space;
  spaces: Space[];
}

export default function DiscoverArchivedSpacesView({ mode }: DiscoverArchivedSpacesViewProps) {
  const location = useLocation();
  const router = useRouter();
  const searchParams = useMemo(() => new URLSearchParams(location.searchStr), [location.searchStr]);
  const [keyword, setKeyword] = useState("");
  const [expandedRepoIds, setExpandedRepoIds] = useState<number[]>([]);
  const [isRepositoryViewModeOpen, setIsRepositoryViewModeOpen] = useState(false);
  const activeRepositoryId = useMemo(() => parseRepositoryId(searchParams.get("repositoryId")), [searchParams]);

  useEffect(() => {
    if (!activeRepositoryId) {
      queueMicrotask(() => setIsRepositoryViewModeOpen(false));
    }
  }, [activeRepositoryId]);

  const openRepositoryInPanel = useCallback((repositoryId: number) => {
    if (!isValidId(repositoryId))
      return;
    const next = new URLSearchParams(searchParams);
    next.set("repositoryId", String(repositoryId));
    router.history.replace(appendPathQuery(location.pathname, next, location.hash));
  }, [location.hash, location.pathname, router, searchParams]);

  const closeRepositoryPanel = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("repositoryId");
    router.history.replace(appendPathQuery(location.pathname, next, location.hash));
    setIsRepositoryViewModeOpen(false);
  }, [location.hash, location.pathname, router, searchParams]);

  const rootRepositoryQuery = useQuery({
    queryKey: ["discoverRootRepositories"],
    queryFn: () => tuanchat.repositoryController.page({
      pageNo: 1,
      pageSize: ROOT_REPOSITORY_PAGE_SIZE,
    }),
    enabled: mode === "square",
    staleTime: 300000,
  });

  // 兼容当前后端：暂无 listArchivedSpacesMy 接口，先复用用户空间缓存再按归档状态筛选。
  const archivedSpacesQuery = useGetUserSpacesQuery({
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
  const topBarInfo = isLoading ? "加载中" : `仓库数量 ${totalCount}`;
  const cardGridClassName = "grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  const toggleExpandedRepo = (repositoryId: number) => {
    setExpandedRepoIds(prev => (prev.includes(repositoryId)
      ? prev.filter(id => id !== repositoryId)
      : [...prev, repositoryId]));
  };

  const shouldHideRepositoryHeader = Boolean(activeRepositoryId && isRepositoryViewModeOpen);

  return (
    <div className="
      flex flex-col size-full min-h-0 min-w-0 bg-base-300/40 text-base-content
    ">
      {!shouldHideRepositoryHeader && (
        <div className="
          sticky top-0 z-20 border-y border-gray-300 bg-base-200/95
          backdrop-blur
          dark:border-gray-700
        ">
          <div className="
            mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3
            sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4
            sm:px-6 sm:py-0
          ">
            {activeRepositoryId
              ? (
                  <>
                    <div className="
                      flex min-w-0 items-center gap-3
                      sm:flex-1
                    ">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost btn-square"
                        onClick={closeRepositoryPanel}
                        aria-label="返回发现"
                        title="返回发现"
                      >
                        <ArrowLeftIcon className="size-5" weight="bold" />
                      </button>
                      <div className="
                        min-w-0 flex-1 truncate text-sm font-semibold
                        text-base-content
                      ">
                        {pageTitle}
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
                    <div className="
                      flex min-w-0 items-center gap-3
                      sm:flex-1
                    ">
                      <div className="
                        min-w-0 flex-1 truncate text-sm font-semibold
                        text-base-content
                      ">{pageTitle}</div>
                      <span className="
                        hidden shrink-0 whitespace-nowrap rounded-full border
                        border-base-300 bg-base-100 px-2 py-0.5 text-[11px]
                        text-base-content/68
                        xl:inline-flex
                      ">
                        {topBarInfo}
                      </span>
                    </div>
                    <div className="
                      relative w-full
                      sm:w-[16rem]
                      lg:w-[20rem]
                      xl:w-88
                    ">
                      <label className="
                        flex h-9 items-center gap-2 rounded-md border
                        border-base-300 bg-base-100 px-3 transition
                        focus-within:border-primary focus-within:ring-2
                        focus-within:ring-primary/20
                      ">
                        <MagnifyingGlassIcon className="
                          size-4 shrink-0 text-base-content/38
                        " />
                        <input
                          className="
                            w-full bg-transparent text-sm text-base-content
                            placeholder:text-base-content/35
                            transition
                            focus:outline-none
                          "
                          value={keyword}
                          onChange={e => setKeyword(e.target.value)}
                          placeholder={mode === "my" ? "搜索我的归档仓库" : "搜索仓库"}
                          aria-label={mode === "my" ? "搜索我的归档仓库" : "搜索仓库"}
                        />
                      </label>
                    </div>
                  </>
                )}
          </div>
        </div>
      )}

      <div className={activeRepositoryId || shouldHideRepositoryHeader ? `
        flex-1 min-h-0 overflow-hidden
      ` : `flex-1 min-h-0 overflow-y-auto`}>
        <div className={activeRepositoryId
          ? "size-full"
          : `
            mx-auto w-full max-w-6xl px-4 py-5
            sm:px-6
            md:px-8 md:py-6
          `}
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
                <div className="space-y-8">
                  <div className="
                    relative rounded-xl overflow-hidden border border-base-300
                    bg-info/10
                  ">
                    <CompassIcon
                      aria-hidden="true"
                      weight="duotone"
                      className="
                        pointer-events-none absolute -right-24 -top-24 hidden
                        size-88 text-primary/15
                        sm:block
                      "
                    />
                    <div className="
                      relative z-10 px-5 py-6
                      sm:px-8 sm:py-10
                    ">
                      <div className="
                        text-2xl
                        sm:text-4xl
                        font-extrabold tracking-tight
                      ">
                        {mode === "my" ? "这里是你的归档仓库" : "探索可发现的仓库"}
                      </div>
                      <div className="
                        mt-2 text-sm
                        sm:text-base
                        text-base-content/70 max-w-2xl
                      ">
                        {mode === "my"
                          ? "这里汇总你归档过的空间对应仓库，方便按仓库回看。"
                          : "浏览根仓库，进入详情后可查看 fork 列表或进一步操作。"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-base-content">{sectionTitle}</div>
                    <div className="text-xs text-base-content/60">{sectionDescription}</div>
                  </div>

                  {isLoading && (
                    <div className={cardGridClassName}>
                      {[0, 1, 2, 3, 4, 5].map(n => (
                        <div key={n} className="
                          h-56 rounded-xl bg-base-300/50 animate-pulse
                        " />
                      ))}
                    </div>
                  )}

                  {isError && (
                    <div className="
                      rounded-xl border border-base-300 bg-base-100 p-4
                    ">
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
                    <div className="
                      rounded-[26px] border border-dashed border-base-300
                      bg-base-100/55 px-5 py-12 text-center
                      sm:px-6 sm:py-14
                    ">
                      <div className="text-lg font-semibold text-base-content">{emptyTitle}</div>
                      <div className="mt-3 text-sm/7 text-base-content/58">{emptyDescription}</div>
                    </div>
                  )}

                  {!isLoading && !isError && mode === "square" && filteredRootRepositories.length > 0 && (
                    <div className={cardGridClassName}>
                      {filteredRootRepositories.map((repository) => {
                        const repositoryId = repository?.repositoryId ?? -1;
                        const name = repository?.repositoryName ?? `仓库 #${repositoryId}`;
                        const description = String(repository?.description ?? "").trim();
                        const image = imageMediumUrl(repository?.coverFileId);
                        const updateLabel = formatDateLabel(repository?.updateTime ?? repository?.createTime);
                        const metadata = [`仓库 #${repositoryId}`];
                        if (updateLabel) {
                          metadata.unshift(`更新于 ${updateLabel}`);
                        }

                        return (
                          <ContentCard
                            key={repositoryId}
                            image={image}
                            title={name}
                            content={description || "暂无描述"}
                            badgeLabel="根仓库"
                            hoverMetadata={metadata}
                            hoverHint="点击查看仓库"
                            imageAspect="square"
                            placeholder={(
                              <div className="
                                flex size-full items-center justify-center
                                bg-linear-to-br from-[#243b55] via-[#141e30]
                                to-[#0b0f17] text-white/75
                              ">
                                <PackageIcon className="size-12" weight="duotone" />
                              </div>
                            )}
                            onClick={() => openRepositoryInPanel(repositoryId)}
                          />
                        );
                      })}
                    </div>
                  )}

                  {!isLoading && !isError && mode === "my" && filteredArchivedRepositoryGroups.length > 0 && (
                    <div className={cardGridClassName}>
                      {filteredArchivedRepositoryGroups.map((group) => {
                        const repositoryId = group.repositoryId;
                        const repository = group.repository;
                        const name = repository?.repositoryName ?? group.latestSpace?.name ?? `仓库 #${repositoryId}`;
                        const description = String(repository?.description ?? group.latestSpace?.description ?? "").trim();
                        const image = imageMediumUrl(repository?.coverFileId);
                        const latestSpace = group.latestSpace;
                        const isExpanded = expandedRepoIds.includes(repositoryId);
                        const latestArchiveLabel = latestSpace?.name ? `最新归档：${latestSpace.name}` : null;
                        const metadata = [
                          latestArchiveLabel,
                          `仓库 #${repositoryId}`,
                        ].filter((item): item is string => Boolean(item));

                        return (
                          <ContentCard
                            key={repositoryId}
                            image={image}
                            title={name}
                            content={description || "暂无描述"}
                            hoverMetadata={metadata}
                            topBadges={["已归档", `版本 ${group.spaces.length}`]}
                            hoverHint="点击查看仓库"
                            imageAspect="square"
                            placeholder={(
                              <div className="
                                flex size-full items-center justify-center
                                bg-linear-to-br from-[#2a2d3e] via-[#1f2937]
                                to-[#111827] text-white/75
                              ">
                                <PackageIcon className="size-12" weight="duotone" />
                              </div>
                            )}
                            titleSuffix={(
                              <button
                                type="button"
                                className="
                                  rounded-md border border-base-300 bg-base-100
                                  px-2.5 py-1 text-xs font-medium
                                  text-base-content transition
                                  hover:border-primary/30 hover:bg-base-100/90
                                "
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleExpandedRepo(repositoryId);
                                }}
                              >
                                {isExpanded ? "收起归档" : "展开归档"}
                              </button>
                            )}
                            bottomSlot={shouldShowArchivedList && isExpanded
                              ? (
                                  <div className="
                                    space-y-2 border-t border-base-300 pt-3
                                  ">
                                    {group.spaces.map((space) => {
                                      const spaceId = space?.spaceId ?? -1;
                                      const targetSpaceId = isValidId(space?.spaceId) ? space.spaceId : null;
                                      const spaceName = space?.name ?? `空间 #${spaceId}`;
                                      const timestamp = space?.updateTime ?? space?.createTime;

                                      return (
                                        <div key={spaceId} className="
                                          flex items-center justify-between
                                          gap-3
                                        ">
                                          <div className="min-w-0">
                                            <div className="
                                              truncate text-sm font-semibold
                                              text-base-content
                                            ">{spaceName}</div>
                                            {timestamp && (
                                              <div className="
                                                text-xs text-base-content/50
                                              ">
                                                {`归档时间：${new Date(timestamp).toLocaleString("zh-CN")}`}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="
                                              rounded-md border border-base-300
                                              bg-base-100 px-2.5 py-1 text-xs
                                              font-medium text-base-content
                                              transition
                                              hover:border-primary/30
                                              hover:bg-base-100/90
                                            "
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              if (!targetSpaceId)
                                                return;
                                              router.history.push(`/chat/${targetSpaceId}`);
                                            }}
                                            disabled={!targetSpaceId}
                                          >
                                            打开归档
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )
                              : undefined}
                            onClick={() => openRepositoryInPanel(repositoryId)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
