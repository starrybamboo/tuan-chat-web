import type { ApiResultPageBaseRespRepository } from "api/models/ApiResultPageBaseRespRepository";
import type { Repository } from "api/models/Repository";

import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useGlobalContext } from "@/components/globalContextProvider";
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

function toRepositories(result?: ApiResultPageBaseRespRepository): Repository[] {
  const data = result?.data?.list;
  return Array.isArray(data) ? data as Repository[] : [];
}

export default function DiscoverArchivedSpacesView({ mode }: DiscoverArchivedSpacesViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const globalContext = useGlobalContext();
  const userId = globalContext.userId ?? -1;
  const activeRepositoryId = useMemo(() => {
    const raw = searchParams.get("repoId");
    const parsed = raw ? Number(raw) : Number.NaN;
    return isValidId(parsed) ? parsed : null;
  }, [searchParams]);

  const openRepositoryDetail = (repositoryId: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("repoId", String(repositoryId));
    setSearchParams(next, { replace: false });
  };

  const closeRepositoryDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("repoId");
    setSearchParams(next, { replace: false });
  };

  const rootRepositoryQuery = useQuery({
    queryKey: ["discoverRootRepositories"],
    queryFn: () => tuanchat.repositoryController.page({
      pageNo: 1,
      pageSize: ROOT_REPOSITORY_PAGE_SIZE,
    }),
    enabled: mode === "square",
    staleTime: 300000,
  });

  const myRepositoryQuery = useQuery({
    queryKey: ["discoverMyRepositories", userId],
    queryFn: () => tuanchat.repositoryController.pageByUserId({
      pageNo: 1,
      pageSize: ROOT_REPOSITORY_PAGE_SIZE,
      userId,
    }),
    enabled: mode === "my" && userId > 0,
    staleTime: 300000,
  });

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

  const myRepositories = useMemo(() => {
    const list = toRepositories(myRepositoryQuery.data)
      .filter(repo => isValidId(repo.repositoryId));

    list.sort((a, b) => {
      const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
      const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
      return bt - at;
    });

    return list;
  }, [myRepositoryQuery.data]);

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

  const filteredMyRepositories = useMemo(() => {
    const q = normalizeText(keyword);
    if (!q)
      return myRepositories;

    return myRepositories.filter((repo) => {
      const name = normalizeText(repo?.repositoryName);
      const desc = normalizeText(repo?.description);
      return name.includes(q) || desc.includes(q);
    });
  }, [keyword, myRepositories]);

  if (activeRepositoryId) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-base-200 text-base-content">
        <div className="sticky top-0 z-20 bg-base-200/90 backdrop-blur border-b border-base-300">
          <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={closeRepositoryDetail}
            >
              返回发现
            </button>
            <span className="text-sm text-base-content/60">查看模组详情</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <RepositoryDetailComponent repositoryId={activeRepositoryId} />
        </div>
      </div>
    );
  }

  const headerTitle = mode === "my" ? "我的仓库" : "仓库广场";
  const headerDescription = mode === "my"
    ? "这里展示你已发布的仓库。"
    : "这里展示所有根仓库，进入详情后可查看 fork 列表。";
  const emptyTitle = mode === "my" ? "暂无已发布仓库" : "暂无可发现的仓库";
  const emptyDescription = mode === "my"
    ? "完成归档发布后，仓库会出现在这里。"
    : "当前没有可展示的根仓库。";

  const isLoading = mode === "square" ? rootRepositoryQuery.isLoading : myRepositoryQuery.isLoading;
  const isError = mode === "square" ? rootRepositoryQuery.isError : myRepositoryQuery.isError;
  const refetch = mode === "square" ? rootRepositoryQuery.refetch : myRepositoryQuery.refetch;

  const totalCount = mode === "square"
    ? filteredRootRepositories.length
    : filteredMyRepositories.length;

  const repositories = mode === "square" ? filteredRootRepositories : filteredMyRepositories;

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
                我的
              </Link>
            </div>
          </div>

          <div className="relative w-full max-w-[360px]">
            <input
              className="input input-sm input-bordered w-full rounded-full"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={mode === "my" ? "搜索我的仓库" : "搜索仓库"}
              aria-label={mode === "my" ? "搜索我的仓库" : "搜索仓库"}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 space-y-6">
          <div className="rounded-xl overflow-hidden border border-base-300 bg-gradient-to-r from-primary/25 via-secondary/10 to-accent/25">
            <div className="px-8 py-10 sm:py-14">
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                {mode === "my" ? "这里是你的仓库" : "探索可发现的仓库"}
              </div>
              <div className="mt-3 text-sm sm:text-base text-base-content/70 max-w-2xl">
                {mode === "my"
                  ? "这里汇总你已发布的仓库，便于统一管理与查看。"
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
                {mode === "my" ? "暂时无法加载我的仓库" : "暂时无法加载仓库广场"}
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

          {!isLoading && !isError && repositories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {repositories.map((repository) => {
                const repositoryId = repository?.repositoryId ?? -1;
                const name = repository?.repositoryName ?? `仓库 #${repositoryId}`;
                const description = String(repository?.description ?? "").trim();
                const image = repository?.image ?? DEFAULT_REPOSITORY_IMAGE;
                const root = isRootRepository(repository);

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
                          {root ? "根仓库" : "Fork"}
                        </span>
                        {mode === "my" && (
                          <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                            我的
                          </span>
                        )}
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
                          onClick={() => openRepositoryDetail(repositoryId)}
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
        </div>
      </div>
    </div>
  );
}
