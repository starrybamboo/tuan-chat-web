import type { Space } from "api/models/Space";
import type { RepositoryData } from "./constants";
import { useGetUserRoomsQuery, useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useRepositoryDetailByIdQuery, useRepositoryForkListQuery } from "api/hooks/repositoryQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import Author from "./author";
// import IssueTab from "./issueTab";

interface RepositoryDetailComponentProps {
  repositoryData?: RepositoryData;
  repositoryId?: number;
  onOpenRepository?: (repositoryId: number) => void;
  embedded?: boolean;
  viewModeOpen?: boolean;
  onViewModeOpenChange?: (open: boolean) => void;
}

type RepositorySpaceCandidate = Space & { spaceId: number };

function isValidSpaceId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseSpaceUpdateTime(value?: string): number {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeSidebarTreeJson(treeJson?: string | null): string | null {
  if (typeof treeJson !== "string") {
    return null;
  }
  const normalized = treeJson.trim();
  return normalized.length > 0 ? normalized : null;
}

function isRepositorySpaceCandidate(space: Space, repositoryId: number): space is RepositorySpaceCandidate {
  return space.repositoryId === repositoryId && isValidSpaceId(space.spaceId);
}

function listRepositorySpaceCandidates(spaces: Space[], repositoryId: number): RepositorySpaceCandidate[] {
  if (!isValidSpaceId(repositoryId)) {
    return [];
  }
  return spaces
    .filter(space => isRepositorySpaceCandidate(space, repositoryId))
    .sort((a, b) => parseSpaceUpdateTime(b.updateTime) - parseSpaceUpdateTime(a.updateTime));
}

export default function RepositoryDetailComponent({
  repositoryData: propRepositoryData,
  repositoryId: propRepositoryId,
  onOpenRepository,
  embedded = false,
  viewModeOpen,
  onViewModeOpenChange,
}: RepositoryDetailComponentProps) {
  const navigate = useNavigate();
  const params = useParams();
  const routeRepositoryId = Number(params.id);
  const repositoryId = useMemo(() => {
    if (typeof propRepositoryId === "number" && Number.isFinite(propRepositoryId) && propRepositoryId > 0) {
      return propRepositoryId;
    }
    return Number.isFinite(routeRepositoryId) && routeRepositoryId > 0 ? routeRepositoryId : 0;
  }, [propRepositoryId, routeRepositoryId]);
  const loadingMinHeightClass = embedded ? "min-h-[40vh]" : "min-h-screen";

  // ===== 所有 Hooks 必须在最前面调用 =====
  // 如果没有传入 repositoryData，则通过 ID 获取
  const { data: fetchedRepositoryData, isLoading: isLoadingRepository, isError: isRepositoryError } = useRepositoryDetailByIdQuery(repositoryId);
  const RuleList = useRuleListQuery();

  // 查看模组内容弹窗（支持受控/非受控）
  const [internalIsViewModeOpen, setInternalIsViewModeOpen] = useState(false);
  const isViewModeOpen = typeof viewModeOpen === "boolean" ? viewModeOpen : internalIsViewModeOpen;
  const setViewModeOpen = (next: boolean) => {
    if (onViewModeOpenChange) {
      onViewModeOpenChange(next);
      return;
    }
    setInternalIsViewModeOpen(next);
  };

  const [isForkListOpen, setIsForkListOpen] = useState(false);

  const forkListQuery = useRepositoryForkListQuery({
    repositoryId,
    pageNo: 1,
    pageSize: 50,
  });

  const forkRepositories = useMemo(() => {
    const list = forkListQuery.data?.data?.list ?? [];
    return list.filter(repo => repo.repositoryId && repo.repositoryId !== repositoryId);
  }, [forkListQuery.data, repositoryId]);

  // 获取 userSpace 数据
  const getUserSpaces = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => getUserSpaces.data?.data ?? [], [getUserSpaces.data?.data]);
  const repositorySpaces = useMemo(() => listRepositorySpaceCandidates(userSpaces, repositoryId), [repositoryId, userSpaces]);
  const repositorySpace = repositorySpaces[0] ?? null;

  const [isCloningModule, setIsCloningModule] = useState(false);
  const cloningModuleLockRef = useRef(false);

  // 克隆失败后显示弹窗
  const [showErrorToast, setShowErrorToast] = useState(false);
  const linkedSpaceId = repositorySpace?.spaceId ?? null;
  const linkedSpace = useMemo(() => {
    if (!linkedSpaceId) {
      return null;
    }
    return userSpaces.find(space => space.spaceId === linkedSpaceId) ?? repositorySpace ?? null;
  }, [linkedSpaceId, repositorySpace, userSpaces]);
  const roomsQuery = useGetUserRoomsQuery(linkedSpaceId ?? -1);
  const linkedRooms = useMemo(() => roomsQuery.data?.data?.rooms ?? [], [roomsQuery.data?.data?.rooms]);
  const viewRoomId = linkedRooms[0]?.roomId ?? null;

  // 图片加载状态
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // ===== 数据处理逻辑 =====
  // 使用传入的数据或获取的数据
  const repositoryData = useMemo(() => {
    if (propRepositoryData) {
      return propRepositoryData;
    }

    if (!fetchedRepositoryData?.data) {
      return null;
    }

    const repository = fetchedRepositoryData.data;
    const rule = RuleList.data?.find(r => r.ruleId === repository.ruleId);

    return {
      repositoryId: repository.repositoryId,
      ruleId: repository.ruleId,
      ruleName: rule?.ruleName ?? "",
      repositoryName: repository.repositoryName,
      description: repository.description,
      userId: repository.userId,
      authorName: repository.authorName,
      image: (repository.image && repository.image !== null && repository.image !== "null") ? String(repository.image) : "",
      createTime: repository.createTime,
      updateTime: repository.updateTime,
      minPeople: repository.minPeople,
      maxPeople: repository.maxPeople,
      minTime: repository.minTime,
      maxTime: repository.maxTime,
      parent: repository.parentRepositoryId === undefined || repository.parentRepositoryId === null ? null : String(repository.parentRepositoryId),
      readMe: repository.readMe,
    } as RepositoryData;
  }, [propRepositoryData, fetchedRepositoryData, RuleList.data]);

  const repositoryImage = repositoryData?.image?.trim() ?? "";

  useEffect(() => {
    if (!repositoryImage) {
      setImageLoading(false);
      setImageError(false);
      return;
    }
    let disposed = false;
    setImageLoading(true);
    setImageError(false);

    const image = new Image();
    const handleLoad = () => {
      if (disposed)
        return;
      setImageLoading(false);
      setImageError(false);
    };
    const handleError = () => {
      if (disposed)
        return;
      setImageLoading(false);
      setImageError(true);
    };
    image.onload = handleLoad;
    image.onerror = handleError;
    image.src = repositoryImage;

    if (image.complete) {
      if (image.naturalWidth > 0)
        handleLoad();
      else
        handleError();
    }

    return () => {
      disposed = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [repositoryImage]);

  const isRootRepository = useMemo(() => repositoryData?.parent == null, [repositoryData]);

  const openRepositoryDetail = (id: number) => {
    if (!id || !Number.isFinite(id))
      return;
    if (onOpenRepository) {
      onOpenRepository(id);
      return;
    }
    navigate(`/repository/detail/${id}`);
  };

  // ===== 条件渲染：加载和错误状态 =====
  // 如果正在加载，显示加载状态
  if (!propRepositoryData && isLoadingRepository) {
    return (
      <div className={`grow flex items-center justify-center ${loadingMinHeightClass}`}>
        <div className="text-center">
          <div className="loading loading-spinner loading-lg mb-4"></div>
          <p className="text-lg">加载仓库数据中...</p>
        </div>
      </div>
    );
  }

  // 如果加载失败，显示错误信息
  if (!propRepositoryData && isRepositoryError) {
    return (
      <div className={`grow flex items-center justify-center ${loadingMinHeightClass}`}>
        <div className="text-center">
          <div className="text-error text-2xl mb-4">❌</div>
          <p className="text-lg text-error mb-4">加载仓库失败</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 如果没有数据，显示空状态
  if (!repositoryData) {
    return (
      <div className={`grow flex items-center justify-center ${loadingMinHeightClass}`}>
        <div className="text-center">
          <p className="text-lg text-base-content/60">未找到仓库数据</p>
        </div>
      </div>
    );
  }

  // ===== 事件处理函数 =====
  const navigateToSpace = async (spaceId: number) => {
    try {
      const roomsData = await tuanchat.roomController.getUserRooms(spaceId);
      const rooms = roomsData?.data?.rooms;
      if (rooms && rooms.length > 0) {
        const firstRoomId = rooms[0].roomId;
        navigate(`/chat/${spaceId}/${firstRoomId}`);
        return;
      }
    }
    catch (error) {
      console.error("获取群组列表失败:", error);
    }
    navigate(`/chat/${spaceId}`);
  };

  const handleCloneModule = async () => {
    if (cloningModuleLockRef.current) {
      return;
    }

    const pickSourceSpaceIdFromCandidates = async (candidates: RepositorySpaceCandidate[]) => {
      if (candidates.length === 0) {
        return null;
      }

      // 同仓库可能存在多个空间，优先选“有 sidebarTree 且最近更新”的来源。
      const hasSidebarTreeFlags = await Promise.all(
        candidates.map(async (space) => {
          try {
            const sidebarTreeResult = await tuanchat.spaceSidebarTreeController.getSidebarTree(space.spaceId);
            return Boolean(normalizeSidebarTreeJson(sidebarTreeResult.data?.treeJson));
          }
          catch {
            return false;
          }
        }),
      );
      const candidateIndex = hasSidebarTreeFlags.findIndex(Boolean);
      if (candidateIndex >= 0) {
        return candidates[candidateIndex].spaceId;
      }
      return candidates[0].spaceId;
    };

    const pickSourceSpaceId = async () => {
      const localSourceSpaceId = await pickSourceSpaceIdFromCandidates(repositorySpaces);
      if (isValidSpaceId(localSourceSpaceId)) {
        return localSourceSpaceId;
      }

      const freshSpacesResult = await getUserSpaces.refetch();
      const freshSpaces = freshSpacesResult.data?.data ?? [];
      const fallbackCandidates = listRepositorySpaceCandidates(freshSpaces, repositoryId);
      return pickSourceSpaceIdFromCandidates(fallbackCandidates);
    };

    const syncSidebarTreeAfterClone = async (sourceSpaceId: number, clonedSpaceId: number) => {
      const sourceTreeResult = await tuanchat.spaceSidebarTreeController.getSidebarTree(sourceSpaceId);
      const sourceTreeJson = normalizeSidebarTreeJson(sourceTreeResult.data?.treeJson);
      if (!sourceTreeJson) {
        return;
      }

      const clonedTreeResult = await tuanchat.spaceSidebarTreeController.getSidebarTree(clonedSpaceId);
      const clonedTreeJson = normalizeSidebarTreeJson(clonedTreeResult.data?.treeJson);
      if (clonedTreeJson === sourceTreeJson) {
        return;
      }

      const expectedVersion = clonedTreeResult.data?.version ?? 0;
      const setResult = await tuanchat.spaceSidebarTreeController.setSidebarTree({
        spaceId: clonedSpaceId,
        expectedVersion,
        treeJson: sourceTreeJson,
      });

      // 版本冲突时，按服务端返回的最新版本再尝试一次。
      if (!setResult.success && setResult.data?.treeJson !== sourceTreeJson) {
        const retryVersion = setResult.data?.version;
        if (typeof retryVersion === "number" && Number.isFinite(retryVersion) && retryVersion >= 0) {
          await tuanchat.spaceSidebarTreeController.setSidebarTree({
            spaceId: clonedSpaceId,
            expectedVersion: retryVersion,
            treeJson: sourceTreeJson,
          });
        }
      }
    };

    cloningModuleLockRef.current = true;
    setIsCloningModule(true);
    try {
      const sourceSpaceId = await pickSourceSpaceId();
      if (!sourceSpaceId) {
        throw new Error("未找到可克隆的源空间");
      }

      const cloneResult = await tuanchat.spaceController.cloneBySpaceId({ spaceId: sourceSpaceId });
      const clonedSpaceId = cloneResult.data;
      if (!(typeof clonedSpaceId === "number" && Number.isFinite(clonedSpaceId) && clonedSpaceId > 0)) {
        throw new Error("克隆后未返回有效空间ID");
      }

      try {
        await syncSidebarTreeAfterClone(sourceSpaceId, clonedSpaceId);
      }
      catch (syncError) {
        console.warn("[RepositoryDetail] 同步 sidebarTree 失败，已忽略：", syncError);
      }

      setViewModeOpen(false);
      void getUserSpaces.refetch();
      await navigateToSpace(clonedSpaceId);
    }
    catch {
      setViewModeOpen(false);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }
    finally {
      cloningModuleLockRef.current = false;
      setIsCloningModule(false);
    }
  };

  // 构建信息数组，只包含有数据的字段
  const infos = [
    repositoryData.parent && { label: "Forked By", value: repositoryData.parent },
    (repositoryData.minPeople || repositoryData.maxPeople) && {
      label: "玩家人数",
      value: repositoryData.minPeople && repositoryData.maxPeople
        ? `${repositoryData.minPeople}-${repositoryData.maxPeople}人`
        : repositoryData.minPeople
          ? `${repositoryData.minPeople}+人`
          : `最多${repositoryData.maxPeople}人`,
    },
    (repositoryData.minTime || repositoryData.maxTime) && {
      label: "游戏时间",
      value: repositoryData.minTime && repositoryData.maxTime
        ? `${repositoryData.minTime}-${repositoryData.maxTime}小时`
        : repositoryData.minTime
          ? `${repositoryData.minTime}+小时`
          : `最长${repositoryData.maxTime}小时`,
    },
    repositoryData.authorName && { label: "作者", value: repositoryData.authorName },
    repositoryData.userId && { label: "上传者ID", value: String(repositoryData.userId) },
    repositoryData.ruleName && { label: "规则", value: String(repositoryData.ruleName) },
    repositoryData.createTime && { label: "创建时间", value: new Date(repositoryData.createTime).toLocaleDateString("zh-CN") },
    repositoryData.updateTime && { label: "最后更新", value: new Date(repositoryData.updateTime).toLocaleString("zh-CN") },
  ].filter((item): item is { label: string; value: string } => Boolean(item)); // 类型断言过滤
  const layoutContainerClassName = embedded && isViewModeOpen
    ? "w-full h-full relative z-10"
    : "mx-auto max-w-7xl p-4 relative z-10";
  const rootContainerClassName = embedded && isViewModeOpen
    ? "bg-base-100 relative h-full"
    : "bg-base-100 relative";
  const viewLayerHostClassName = embedded && isViewModeOpen
    ? "relative h-full"
    : "relative";
  const detailLayoutClassName = embedded && isViewModeOpen
    ? "hidden"
    : "flex flex-col gap-6 md:flex-row md:gap-6";
  const viewOverlayClassName = embedded
    ? "absolute inset-0 z-30 border border-base-300 bg-base-100 shadow-lg overflow-hidden"
    : "absolute inset-0 z-20 rounded-lg border border-base-300 bg-base-100 shadow-lg overflow-hidden";
  const cloneButtonContent = isCloningModule
    ? (
        <>
          <span className="loading loading-spinner loading-xs"></span>
          克隆中...
        </>
      )
    : "克隆模组";

  return (
    <>
      <div className={rootContainerClassName}>
        <div className={layoutContainerClassName}>
          <div className={viewLayerHostClassName}>
            <div className={detailLayoutClassName}>
              <div className="w-1/4 flex flex-col gap-4 md:sticky md:top-0 md:self-start">
                <div className="p-8 flex flex-col gap-4 bg-base-200 rounded-lg border-2 border-base-300 ">
                  <div className="w-full flex items-center justify-center relative rounded-md overflow-hidden">
                    {repositoryImage
                      ? (
                          <>
                            {imageLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-20">
                                <div className="loading loading-spinner loading-lg"></div>
                              </div>
                            )}
                            {imageError && (
                              <div className="absolute inset-0 flex items-center justify-center bg-base-200 z-20">
                                <div className="text-center">
                                  <svg className="w-16 h-16 mx-auto mb-2 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <p className="text-base-content/60 text-sm">图片加载失败</p>
                                </div>
                              </div>
                            )}
                            <img
                              className={`aspect-square object-cover w-full z-0 ${imageLoading || imageError ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
                              src={repositoryImage}
                              onLoad={() => setImageLoading(false)}
                              onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                              }}
                              alt={repositoryData.repositoryName}
                            />
                          </>
                        )
                      : (
                          <div className="w-full aspect-square bg-base-200 flex items-center justify-center text-base-content/60 text-sm rounded-md">
                            暂无封面
                          </div>
                        )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold leading-snug wrap-break-words">
                      {repositoryData.repositoryName}
                    </h1>
                    <p className="text-sm text-base-content/70 leading-relaxed whitespace-pre-wrap wrap-break-words">
                      {repositoryData.description || "暂无描述"}
                    </p>
                  </div>

                  {infos.length > 0 && (
                    <div className="flex border border-base-300 rounded-lg p-3 gap-3">
                      <div className="flex flex-col gap-2">
                        {infos.map(info => (
                          <h3 key={`label-${info.label}`} className="text-sm font-semibold">{info.label}</h3>
                        ))}
                      </div>
                      <div className="divider divider-horizontal m-0" />
                      <div className="flex flex-col gap-2">
                        {infos.map(info => (
                          <h4 key={`value-${info.label}`} className="text-sm">{info.value}</h4>
                        ))}
                      </div>
                    </div>
                  )}

                  {isRootRepository && (
                    <div className="rounded-lg border border-base-300 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">Fork 仓库</div>
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => setIsForkListOpen(prev => !prev)}
                        >
                          {isForkListOpen ? "收起" : `展开 ${forkRepositories.length}`}
                        </button>
                      </div>
                      {isForkListOpen && (
                        <div className="mt-3 space-y-2">
                          {forkListQuery.isLoading && (
                            <div className="text-xs text-base-content/60">加载中...</div>
                          )}
                          {forkListQuery.isError && (
                            <div className="text-xs text-error">加载失败</div>
                          )}
                          {!forkListQuery.isLoading && !forkListQuery.isError && forkRepositories.length === 0 && (
                            <div className="text-xs text-base-content/60">暂无 fork 仓库</div>
                          )}
                          {forkRepositories.map((repo) => {
                            const id = repo.repositoryId ?? -1;
                            const name = repo.repositoryName ?? `仓库 #${id}`;
                            return (
                              <button
                                key={id}
                                type="button"
                                className="w-full text-left rounded-md border border-base-300 bg-base-200/60 px-3 py-2 text-xs transition hover:bg-base-300/60"
                                onClick={() => openRepositoryDetail(id)}
                              >
                                <div className="font-semibold truncate">{name}</div>
                                {repo.description && (
                                  <div className="text-[11px] text-base-content/60 line-clamp-2">{repo.description}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Author userId={repositoryData.userId} />
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      onClick={() => setViewModeOpen(true)}
                    >
                      查看模组内容
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex divider divider-horizontal self-stretch m-0" aria-hidden />

              <div className="flex-1 min-w-0 min-h-0 overflow-visible">
                <div className="rounded-md min-h-60 overflow-visible">
                  {linkedSpaceId
                    ? (
                        <BlocksuiteDescriptionEditor
                          workspaceId={`space:${linkedSpaceId}`}
                          spaceId={linkedSpaceId}
                          docId={buildSpaceDocId({ kind: "space_description", spaceId: linkedSpaceId })}
                          readOnly
                          mode="page"
                          tcHeader={{
                            enabled: true,
                            fallbackTitle: linkedSpace?.name ?? repositoryData.repositoryName,
                            fallbackImageUrl: linkedSpace?.avatar ?? repositoryData.image,
                          }}
                        />
                      )
                    : (
                        <div className="flex flex-col items-center justify-center text-base-content/60 text-sm py-12">
                          <div className="mb-3">暂无关联空间资料</div>
                          <button
                            type="button"
                            className="btn btn-sm gap-2"
                            onClick={handleCloneModule}
                            disabled={isCloningModule}
                          >
                            {cloneButtonContent}
                          </button>
                        </div>
                      )}
                </div>
              </div>
            </div>

            {isViewModeOpen && (
              <div className={viewOverlayClassName}>
                <div className="flex h-full min-h-0 flex-col">
                  <div className="flex items-center justify-between gap-3 border-b border-info/20 bg-info/10 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-info min-w-0">
                      <span className="badge badge-info badge-outline">查看模式</span>
                      <span className="truncate">正在预览模组内容</span>
                      {linkedSpace?.name && (
                        <span className="text-base-content/60 truncate">
                          ·
                          {linkedSpace.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setViewModeOpen(false)}
                      >
                        关闭预览
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary gap-2"
                        onClick={handleCloneModule}
                        disabled={isCloningModule}
                      >
                        {cloneButtonContent}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 bg-base-200/30">
                    {!linkedSpaceId && (
                      <div className="flex h-full flex-col items-center justify-center text-base-content/60 gap-3">
                        <div className="text-base">暂无可查看的模组内容</div>
                        <div className="text-sm">先克隆模组到空间后再查看</div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary gap-2"
                          onClick={handleCloneModule}
                          disabled={isCloningModule}
                        >
                          {cloneButtonContent}
                        </button>
                      </div>
                    )}
                    {linkedSpaceId && roomsQuery.isLoading && (
                      <div className="flex h-full items-center justify-center gap-3 text-base-content/60">
                        <div className="loading loading-spinner loading-md"></div>
                        <span className="text-sm">加载房间中...</span>
                      </div>
                    )}
                    {linkedSpaceId && roomsQuery.isError && (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-base-content/60">
                        <div className="text-base">加载房间失败</div>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => roomsQuery.refetch()}
                        >
                          重试
                        </button>
                      </div>
                    )}
                    {linkedSpaceId && !roomsQuery.isLoading && !roomsQuery.isError && !viewRoomId && (
                      <div className="flex h-full flex-col items-center justify-center text-base-content/60 gap-3">
                        <div className="text-base">当前空间暂无可查看的房间</div>
                      </div>
                    )}
                    {linkedSpaceId && viewRoomId && (
                      <div className="h-full min-h-0">
                        <RoomWindow
                          roomId={viewRoomId}
                          spaceId={linkedSpaceId}
                          viewMode
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showErrorToast && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
          ❌ 克隆失败！
        </div>
      )}
    </>
  );
}
