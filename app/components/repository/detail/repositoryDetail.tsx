import type { RepositoryData } from "./constants";
import type { RepositorySpaceCandidate } from "./repositoryDetail.helpers";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUserRoomsQuery, useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useRepositoryDetailByIdQuery } from "api/hooks/repositoryQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/space/spaceDocId";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor";
import {
  BLOCKSUITE_FULL_PANEL_EDITOR_CLASS,
} from "@/components/chat/shared/components/BlockSuite/blocksuiteDescriptionEditor.shared";
import Author from "./author";
import {
  findRecoverableRepositorySpace,
  isValidCommitId,
  isValidSpaceId,
  listRepositorySpaceCandidates,

  resolvePreviewRoomId,
  resolveRepositoryPrimaryAction,
} from "./repositoryDetail.helpers";
// import IssueTab from "./issueTab";

interface RepositoryDetailComponentProps {
  repositoryData?: RepositoryData;
  repositoryId?: number;
  onOpenRepository?: (repositoryId: number) => void;
  embedded?: boolean;
  viewModeOpen?: boolean;
  onViewModeOpenChange?: (open: boolean) => void;
}

async function cloneSpaceByCommitId(repositoryId: number, commitId: number): Promise<number> {
  const response = await tuanchat.spaceController.cloneByCommitId({ repositoryId, commitId });
  const clonedSpaceId = response?.data;
  if (typeof clonedSpaceId === "number" && Number.isFinite(clonedSpaceId) && clonedSpaceId > 0) {
    return clonedSpaceId;
  }
  throw new Error(response?.errMsg ?? "根据提交克隆失败");
}

async function recoverArchivedSpaceById(spaceId: number): Promise<void> {
  const response = await tuanchat.spaceController.recoverArchivedSpace({ spaceId });
  if (!response?.success) {
    throw new Error(response?.errMsg ?? "恢复编辑失败");
  }
}

export default function RepositoryDetailComponent({
  repositoryData: propRepositoryData,
  repositoryId: propRepositoryId,
  embedded = false,
  viewModeOpen,
  onViewModeOpenChange,
}: RepositoryDetailComponentProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  // 房间预览弹窗（支持受控/非受控）
  const [internalIsViewModeOpen, setInternalIsViewModeOpen] = useState(false);
  const isViewModeOpen = typeof viewModeOpen === "boolean" ? viewModeOpen : internalIsViewModeOpen;
  const setViewModeOpen = (next: boolean) => {
    if (onViewModeOpenChange) {
      onViewModeOpenChange(next);
      return;
    }
    setInternalIsViewModeOpen(next);
  };

  // 获取 userSpace 数据
  const getUserSpaces = useGetUserSpacesQuery();
  const userSpaces = useMemo(() => getUserSpaces.data?.data ?? [], [getUserSpaces.data?.data]);
  const repositorySpaces = useMemo(() => listRepositorySpaceCandidates(userSpaces, repositoryId), [repositoryId, userSpaces]);
  const repositorySpace = repositorySpaces[0] ?? null;

  const [isCloningModule, setIsCloningModule] = useState(false);
  const [isRecoveringRepositorySpace, setIsRecoveringRepositorySpace] = useState(false);
  const cloningModuleLockRef = useRef(false);
  const errorToastTimerRef = useRef<number | null>(null);

  const [errorToastMessage, setErrorToastMessage] = useState<string | null>(null);
  const linkedSpaceId = repositorySpace?.spaceId ?? null;
  const linkedSpace = useMemo(() => {
    if (!linkedSpaceId) {
      return null;
    }
    return (userSpaces.find(space => space.spaceId === linkedSpaceId) as RepositorySpaceCandidate | undefined) ?? repositorySpace ?? null;
  }, [linkedSpaceId, repositorySpace, userSpaces]);
  const roomsQuery = useGetUserRoomsQuery(linkedSpaceId ?? -1);
  const linkedRooms = useMemo(() => (roomsQuery.data?.data?.rooms ?? []).filter(room => isValidSpaceId(room.roomId)), [roomsQuery.data?.data?.rooms]);
  const [selectedViewRoomId, setSelectedViewRoomId] = useState<number | null>(null);
  const viewRoomId = useMemo(() => resolvePreviewRoomId(linkedRooms, selectedViewRoomId), [linkedRooms, selectedViewRoomId]);

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
      commitId: repository.commitId,
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

  const latestRepositoryCommitId = useMemo(() => {
    const commitId = repositoryData?.commitId;
    if (typeof commitId === "number" && Number.isFinite(commitId) && commitId > 0) {
      return commitId;
    }
    return null;
  }, [repositoryData?.commitId]);

  const recoverableRepositorySpace = useMemo(
    () => findRecoverableRepositorySpace(repositorySpaces, latestRepositoryCommitId),
    [latestRepositoryCommitId, repositorySpaces],
  );
  const primaryAction = useMemo(
    () => resolveRepositoryPrimaryAction({ linkedSpace, recoverableSpace: recoverableRepositorySpace }),
    [linkedSpace, recoverableRepositorySpace],
  );

  const repositoryImage = repositoryData?.image?.trim() ?? "";

  const showErrorToast = (message: string) => {
    setErrorToastMessage(message);
    if (typeof window === "undefined") {
      return;
    }
    if (errorToastTimerRef.current != null) {
      window.clearTimeout(errorToastTimerRef.current);
    }
    errorToastTimerRef.current = window.setTimeout(() => {
      setErrorToastMessage(null);
      errorToastTimerRef.current = null;
    }, 3000);
  };

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

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") {
        return;
      }
      if (errorToastTimerRef.current != null) {
        window.clearTimeout(errorToastTimerRef.current);
      }
    };
  }, []);

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
  const refreshUserSpaceCaches = async () => {
    // 空间列表在多个页面使用两套 queryKey，克隆后需要一起失效+重取。
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["getUserSpaces"] }),
      queryClient.invalidateQueries({ queryKey: ["getUserActiveSpaces"] }),
    ]);
    await Promise.allSettled([
      getUserSpaces.refetch(),
      queryClient.refetchQueries({ queryKey: ["getUserActiveSpaces"], type: "all" }),
    ]);
  };

  const cloneModule = async () => {
    if (cloningModuleLockRef.current) {
      return;
    }

    cloningModuleLockRef.current = true;
    setIsCloningModule(true);
    try {
      if (!isValidSpaceId(repositoryId)) {
        throw new Error("仓库ID无效，无法克隆");
      }
      if (!isValidCommitId(latestRepositoryCommitId)) {
        throw new Error("仓库缺少可克隆提交");
      }
      const clonedSpaceId = await cloneSpaceByCommitId(repositoryId, latestRepositoryCommitId);

      setViewModeOpen(false);
      await refreshUserSpaceCaches();
      await navigateToSpace(clonedSpaceId);
    }
    catch {
      setViewModeOpen(false);
      showErrorToast("创建副本失败，请重试");
    }
    finally {
      cloningModuleLockRef.current = false;
      setIsCloningModule(false);
    }
  };

  const handleRecoverRepositorySpace = async () => {
    const targetSpaceId = primaryAction.kind === "recover" ? primaryAction.space.spaceId : null;
    if (!isValidSpaceId(targetSpaceId)) {
      return;
    }
    if (isCloningModule || isRecoveringRepositorySpace) {
      return;
    }

    setIsRecoveringRepositorySpace(true);
    try {
      await recoverArchivedSpaceById(targetSpaceId);
      setViewModeOpen(false);
      await refreshUserSpaceCaches();
      await navigateToSpace(targetSpaceId);
    }
    catch (error) {
      console.error("[RepositoryDetail] 恢复编辑失败:", error);
      showErrorToast("恢复编辑失败，请重试");
    }
    finally {
      setIsRecoveringRepositorySpace(false);
    }
  };

  const handlePrimaryAction = () => {
    if (isCloningModule || isRecoveringRepositorySpace) {
      return;
    }
    if (primaryAction.kind === "continue") {
      setViewModeOpen(false);
      void navigateToSpace(primaryAction.space.spaceId);
      return;
    }
    if (primaryAction.kind === "recover") {
      void handleRecoverRepositorySpace();
      return;
    }
    void cloneModule();
  };

  const layoutContainerClassName = embedded
    ? "w-full h-full min-h-0 relative z-10"
    : "mx-auto max-w-7xl p-4 relative z-10";
  const rootContainerClassName = embedded
    ? "bg-base-100 relative h-full min-h-0 overflow-hidden"
    : "bg-base-100 relative";
  const viewLayerHostClassName = embedded
    ? "relative h-full min-h-0"
    : "relative";
  const detailLayoutClassName = embedded && isViewModeOpen
    ? "hidden"
    : embedded
      ? "flex h-full min-h-0 flex-col gap-6 p-4 md:flex-row md:gap-6"
      : "flex flex-col gap-6 md:flex-row md:gap-6";
  const viewOverlayClassName = embedded
    ? "absolute inset-0 z-30 border border-base-300 bg-base-100 shadow-lg overflow-hidden"
    : "absolute inset-0 z-20 rounded-lg border border-base-300 bg-base-100 shadow-lg overflow-hidden";
  const createCopyButtonContent = isCloningModule
    ? (
        <>
          <span className="loading loading-spinner loading-xs"></span>
          创建副本中...
        </>
      )
    : "创建副本";
  const primaryActionButtonContent = primaryAction.kind === "continue"
    ? "进入编辑"
    : primaryAction.kind === "recover"
      ? (
          <>
            {isRecoveringRepositorySpace && <span className="loading loading-spinner loading-xs"></span>}
            恢复编辑
          </>
        )
      : createCopyButtonContent;

  return (
    <>
      <div className={rootContainerClassName}>
        <div className={layoutContainerClassName}>
          <div className={viewLayerHostClassName}>
            <div className={detailLayoutClassName}>
              <div className="w-full md:w-1/4 flex flex-col gap-4 md:sticky md:top-0 md:self-start">
                <div className="p-4 flex flex-col gap-4 bg-base-200 rounded-lg border-2 border-base-300 ">
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
                  </div>

                  <Author userId={repositoryData.userId} />
                </div>
              </div>

              <div className="hidden md:flex divider divider-horizontal self-stretch m-0" aria-hidden />

              <div className="flex-1 min-w-0 min-h-0 overflow-visible">
                <div className="h-full min-h-0 overflow-hidden rounded-md">
                  {linkedSpaceId
                    ? (
                        <BlocksuiteDescriptionEditor
                          workspaceId={`space:${linkedSpaceId}`}
                          spaceId={linkedSpaceId}
                          docId={buildSpaceDocId({ kind: "space_description", spaceId: linkedSpaceId })}
                          className={BLOCKSUITE_FULL_PANEL_EDITOR_CLASS}
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
                            onClick={handlePrimaryAction}
                            disabled={isCloningModule || isRecoveringRepositorySpace}
                          >
                            {primaryActionButtonContent}
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
                      {linkedSpaceId && !roomsQuery.isLoading && !roomsQuery.isError && linkedRooms.length === 1 && (
                        <span className="text-base-content/60 truncate">
                          ·
                          {linkedRooms[0]?.name ?? `房间 #${linkedRooms[0]?.roomId}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {linkedSpaceId && !roomsQuery.isLoading && !roomsQuery.isError && linkedRooms.length > 1 && (
                        <select
                          className="select select-sm select-bordered max-w-56"
                          aria-label="选择预览房间"
                          value={viewRoomId ?? ""}
                          onChange={(event) => {
                            const nextRoomId = Number(event.target.value);
                            setSelectedViewRoomId(Number.isFinite(nextRoomId) ? nextRoomId : null);
                          }}
                        >
                          {linkedRooms.map(room => (
                            <option key={room.roomId} value={room.roomId}>
                              {room.name ?? `房间 #${room.roomId}`}
                            </option>
                          ))}
                        </select>
                      )}
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
                        onClick={handlePrimaryAction}
                        disabled={isCloningModule || isRecoveringRepositorySpace}
                      >
                        {primaryActionButtonContent}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 bg-base-200/30">
                    {!linkedSpaceId && (
                      <div className="flex h-full flex-col items-center justify-center text-base-content/60 gap-3">
                        <div className="text-base">暂无可查看的模组内容</div>
                        <div className="text-sm">{primaryAction.kind === "recover" ? "先恢复编辑后再查看" : "先创建副本后再查看"}</div>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary gap-2"
                          onClick={handlePrimaryAction}
                          disabled={isCloningModule || isRecoveringRepositorySpace}
                        >
                          {primaryActionButtonContent}
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
      {errorToastMessage && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
          {`❌ ${errorToastMessage}`}
        </div>
      )}
    </>
  );
}
