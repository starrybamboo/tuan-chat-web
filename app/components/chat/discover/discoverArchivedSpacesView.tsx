import { useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import { useGlobalContext } from "@/components/globalContextProvider";

export type DiscoverArchivedSpacesMode = "square" | "my";

export interface DiscoverArchivedSpacesViewProps {
  mode: DiscoverArchivedSpacesMode;
}

function toEpochMs(value?: string) {
  if (!value)
    return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function uniqNumbers(list: number[]) {
  return [...new Set(list.filter(n => typeof n === "number" && Number.isFinite(n)))];
}

export default function DiscoverArchivedSpacesView({ mode }: DiscoverArchivedSpacesViewProps) {
  const navigate = useNavigate();
  const spacesQuery = useGetUserSpacesQuery();
  const [keyword, setKeyword] = useState("");
  const userId = useGlobalContext().userId ?? -1;
  const [myArchivedSpaceIds, setMyArchivedSpaceIds] = useLocalStorage<number[]>(
    `tc:discover:myArchivedSpaces:${userId}`,
    [],
  );

  const myArchivedSpaceIdSet = useMemo(() => {
    return new Set(myArchivedSpaceIds);
  }, [myArchivedSpaceIds]);

  const archivedSpaces = useMemo(() => {
    const raw = Array.isArray(spacesQuery.data?.data) ? spacesQuery.data?.data : [];
    const base = raw
      .filter(space => space?.status === 2)
      .filter((space) => {
        const id = space?.spaceId;
        return typeof id === "number" && Number.isFinite(id) && id > 0;
      });

    const list = mode === "my"
      ? base.filter((space) => {
          const id = space?.spaceId;
          return typeof id === "number" && myArchivedSpaceIdSet.has(id);
        })
      : base;

    list.sort((a, b) => {
      const at = toEpochMs(a?.updateTime) || toEpochMs(a?.createTime);
      const bt = toEpochMs(b?.updateTime) || toEpochMs(b?.createTime);
      return bt - at;
    });

    const q = keyword.trim().toLowerCase();
    if (!q)
      return list;

    return list.filter((space) => {
      const name = String(space?.name ?? "").trim().toLowerCase();
      const desc = String(space?.description ?? "").trim().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [keyword, mode, myArchivedSpaceIdSet, spacesQuery.data?.data]);

  const headerTitle = mode === "my" ? "我的归档" : "广场";
  const headerDescription = mode === "my"
    ? "这里会展示你手动加入“我的归档”的群聊（空间）。"
    : "这里会展示你加入过的、已归档的群聊（空间）。";
  const emptyTitle = mode === "my" ? "暂无我的归档" : "暂无已归档群聊";
  const emptyDescription = mode === "my"
    ? "你可以先在“广场”里把某个已归档群聊加入“我的归档”。"
    : "你可以在聊天室的空间右键菜单中选择“归档空间”，归档后会出现在这里。";

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
              placeholder={mode === "my" ? "搜索我的归档" : "搜索已归档群聊"}
              aria-label={mode === "my" ? "搜索我的归档" : "搜索已归档群聊"}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6 space-y-6">
          {/* Hero */}
          <div className="rounded-xl overflow-hidden border border-base-300 bg-gradient-to-r from-primary/25 via-secondary/10 to-accent/25">
            <div className="px-8 py-10 sm:py-14">
              <div className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                {mode === "my" ? "这是你的收藏夹" : "找到自己的社区"}
              </div>
              <div className="mt-3 text-sm sm:text-base text-base-content/70 max-w-2xl">
                {mode === "my"
                  ? "把喜欢的归档群聊加入这里，随时快速回访。"
                  : "从你加入过的归档群聊里，快速找到想继续的故事。"}
              </div>
            </div>
          </div>

          {/* 分区标题 */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{headerTitle}</div>
              <div className="mt-1 text-xs text-base-content/60">{headerDescription}</div>
            </div>
            <div className="text-xs text-base-content/60">{`已归档 ${archivedSpaces.length}`}</div>
          </div>

          {spacesQuery.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <div key={n} className="h-56 rounded-xl bg-base-300/50 animate-pulse" />
              ))}
            </div>
          )}

          {!spacesQuery.isLoading && archivedSpaces.length === 0 && (
            <div className="rounded-xl border border-base-300 bg-base-100 p-6">
              <div className="text-base font-semibold">{emptyTitle}</div>
              <div className="mt-2 text-sm text-base-content/60">{emptyDescription}</div>
            </div>
          )}

          {!spacesQuery.isLoading && archivedSpaces.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {archivedSpaces.map((space) => {
                const spaceId = space?.spaceId ?? -1;
                const name = space?.name ?? `空间 #${spaceId}`;
                const description = String(space?.description ?? "").trim();
                const avatar = space?.avatar ?? "/moduleDefaultImage.webp";
                const isInMyArchive = myArchivedSpaceIdSet.has(spaceId);

                return (
                  <div
                    key={spaceId}
                    className="group rounded-xl border border-base-300 bg-base-100 shadow-sm overflow-hidden transition-transform hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative h-28 bg-base-300">
                      <img
                        src={avatar}
                        alt={String(name)}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-base-100 via-transparent to-transparent" />

                      <div className="absolute left-3 top-3 flex items-center gap-2">
                        <span className="badge badge-sm bg-base-100/70 border border-base-300 text-base-content backdrop-blur">
                          已归档
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`absolute right-3 top-3 btn btn-xs rounded-md ${isInMyArchive ? "btn-primary" : "btn-ghost bg-base-100/60 hover:bg-base-100/80"}`}
                        onClick={() => {
                          const next = isInMyArchive
                            ? myArchivedSpaceIds.filter(id => id !== spaceId)
                            : [...myArchivedSpaceIds, spaceId];
                          setMyArchivedSpaceIds(uniqNumbers(next));
                        }}
                        aria-label={isInMyArchive ? "移出我的归档" : "加入我的归档"}
                        title={isInMyArchive ? "移出我的归档" : "加入我的归档"}
                      >
                        {isInMyArchive ? "已收藏" : "收藏"}
                      </button>
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
                        <div className="text-[11px] text-base-content/50 shrink-0">{`#${spaceId}`}</div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigate(`/space-preview/${spaceId}`)}
                        >
                          预览
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => navigate(`/chat/${spaceId}`)}
                        >
                          打开
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
