import type { RepositoryData } from "./constants";
import { useCreateSpaceMutation, useGetUserRoomsQuery, useGetUserSpacesQuery } from "api/hooks/chatQueryHooks";
import { useRepositoryDetailByIdQuery, useRepositoryForkListQuery } from "api/hooks/repositoryQueryHooks";
import { useRuleListQuery } from "api/hooks/ruleQueryHooks";
import { useImportFromRepositoryMutation } from "api/hooks/spaceRepositoryHooks";
import { tuanchat } from "api/instance";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import RoomWindow from "@/components/chat/room/roomWindow";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { PopWindow } from "@/components/common/popWindow";
import Author from "./author";
// import IssueTab from "./issueTab";

export default function RepositoryDetailComponent({ repositoryData: propRepositoryData }: { repositoryData?: RepositoryData }) {
  const navigate = useNavigate();
  const params = useParams();
  const repositoryId = Number(params.id);

  // ===== 所有 Hooks 必须在最前面调用 =====
  // 如果没有传入 repositoryData，则通过 ID 获取
  const { data: fetchedRepositoryData, isLoading: isLoadingRepository, isError: isRepositoryError } = useRepositoryDetailByIdQuery(repositoryId);
  const RuleList = useRuleListQuery();

  // 查看模组内容弹窗
  const [isViewModeOpen, setIsViewModeOpen] = useState(false);

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
  const repositorySpace = useMemo(() => {
    return userSpaces.find(space => space.repositoryId === repositoryId) ?? null;
  }, [userSpaces, repositoryId]);

  // 仓库导入空间
  const importFromRepository = useImportFromRepositoryMutation();

  // 导入成功后显示弹窗
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 导入失败后显示弹窗
  const [showErrorToast, setShowErrorToast] = useState(false);

  // 创建空间并导入仓库
  const createSpaceMutation = useCreateSpaceMutation();

  // 确认跳转弹窗
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [newSpaceId, setNewSpaceId] = useState<number | null>(null);
  const linkedSpaceId = newSpaceId ?? repositorySpace?.spaceId ?? null;
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

  // 背景图片加载状态
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  const [bgImageError, setBgImageError] = useState(false);

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
      setBgImageLoaded(false);
      setBgImageError(false);
      return;
    }
    setImageLoading(true);
    setImageError(false);
    setBgImageLoaded(false);
    setBgImageError(false);
  }, [repositoryImage]);

  const isRootRepository = useMemo(() => repositoryData?.parent == null, [repositoryData]);

  // ===== 条件渲染：加载和错误状态 =====
  // 如果正在加载，显示加载状态
  if (!propRepositoryData && isLoadingRepository) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen">
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
      <div className="flex-grow flex items-center justify-center min-h-screen">
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
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-base-content/60">未找到仓库数据</p>
        </div>
      </div>
    );
  }

  // ===== 事件处理函数 =====
  const handleDirectCreateSpaceAndImport = () => {
    createSpaceMutation.mutate({
      userIdList: [],
      avatar: repositoryData.image,
      spaceName: repositoryData.repositoryName,
      ruleId: repositoryData.ruleId || 1,
    }, {
      onSuccess: (data) => {
        const newSpaceId = data.data?.spaceId;
        if (newSpaceId) {
          importFromRepository.mutate({ spaceId: newSpaceId, repositoryId }, {
            onSuccess: () => {
              setIsViewModeOpen(false);
              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
              setNewSpaceId(newSpaceId);
              setShowConfirmPopup(true);
            },
            onError: () => {
              setIsViewModeOpen(false);
              setShowErrorToast(true);
              setTimeout(() => setShowErrorToast(false), 3000);
            },
          });
        }
      },
      onError: () => {
        setIsViewModeOpen(false);
        setShowErrorToast(true);
        setTimeout(() => setShowErrorToast(false), 3000);
      },
    });
  };

  // 处理跳转到新空间
  const handleNavigateToNewSpace = async () => {
    if (newSpaceId) {
      try {
        const roomsData = await tuanchat.roomController.getUserRooms(newSpaceId);

        const rooms = roomsData?.data?.rooms;
        if (rooms && rooms.length > 0) {
          const firstRoomId = rooms[0].roomId;
          navigate(`/chat/${newSpaceId}/${firstRoomId}`);
        }
        else {
          navigate(`/chat/${newSpaceId}`);
        }
      }
      catch (error) {
        console.error("获取群组列表失败:", error);
        navigate(`/chat/${newSpaceId}`);
      }
      setShowConfirmPopup(false);
    }
  };

  // 处理取消跳转
  const handleCancelNavigate = () => {
    setShowConfirmPopup(false);
    setNewSpaceId(null);
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

  return (
    <>
      <div className="bg-base-100 relative">
        {/* 背景层容器 - 限制模糊效果范围，仅在大屏显示 */}
        <div className="hidden lg:block absolute top-0 left-0 w-full h-100 overflow-hidden z-0">
          {/* 无数据或加载失败时的占位背景 */}
          {(!repositoryData || !repositoryImage || bgImageError) && (
            <div className="absolute inset-0 bg-base-200 z-0"></div>
          )}
          {/* 背景图 - 有数据且未出错时显示（包括加载中） */}
          {repositoryData && repositoryImage && !bgImageError && (
            <img
              src={repositoryImage}
              className={`absolute -top-6 -left-6 w-[calc(100%+48px)] h-[calc(100%+48px)] object-cover blur-sm z-0 ${bgImageLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
              onLoad={() => setBgImageLoaded(true)}
              onError={() => {
                setBgImageLoaded(false);
                setBgImageError(true);
              }}
              alt="背景"
            />
          )}
          {/* 遮罩层 - 只在图片加载完成后显示 */}
          {repositoryData && repositoryImage && !bgImageError && bgImageLoaded && (
            <div className="absolute top-0 left-0 w-full h-full bg-black/40 z-10 pointer-events-none" />
          )}
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 relative z-10">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            <div className="w-full md:w-[32%] lg:w-[28%] flex flex-col gap-4">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-4 flex flex-col gap-4">
                <div className="w-full flex items-center justify-center relative">
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
                        <div className="w-full aspect-square bg-base-200 flex items-center justify-center text-base-content/60 text-sm">
                          暂无封面
                        </div>
                      )}
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-bold leading-snug break-words">
                    {repositoryData.repositoryName}
                  </h1>
                  <p className="text-sm text-base-content/70 leading-relaxed whitespace-pre-wrap break-words">
                    {repositoryData.description || "暂无描述"}
                  </p>
                </div>

                {infos.length > 0 && (
                  <div className="flex border border-base-300 rounded-lg p-3 gap-3 bg-base-100">
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
                  <div className="rounded-lg border border-base-300 bg-base-100 p-3">
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
                              onClick={() => navigate(`/repository/detail/${id}`)}
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
                    onClick={() => setIsViewModeOpen(true)}
                  >
                    查看模组内容
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="rounded-2xl border border-base-300 bg-base-100 p-4 min-h-[280px]">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="text-lg font-semibold">空间资料</div>
                    {linkedSpace?.name && (
                      <div className="text-xs text-base-content/60">{linkedSpace.name}</div>
                    )}
                  </div>
                  {linkedSpaceId && (
                    <span className="text-xs text-base-content/50">
                      #
                      {linkedSpaceId}
                    </span>
                  )}
                </div>
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
                          className="btn btn-sm"
                          onClick={handleDirectCreateSpaceAndImport}
                        >
                          克隆模组
                        </button>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <PopWindow isOpen={isViewModeOpen} onClose={() => setIsViewModeOpen(false)} fullScreen>
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-info/20 bg-info/10 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-info">
              <span className="badge badge-info badge-outline">查看模式</span>
              <span>正在预览模组内容</span>
              {linkedSpace?.name && (
                <span className="text-base-content/60">
                  ·
                  {linkedSpace.name}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleDirectCreateSpaceAndImport}
            >
              克隆模组
            </button>
          </div>

          <div className="flex-1 min-h-0 bg-base-200/30">
            {!linkedSpaceId && (
              <div className="flex h-full flex-col items-center justify-center text-base-content/60 gap-3">
                <div className="text-base">暂无可查看的模组内容</div>
                <div className="text-sm">先克隆模组到空间后再查看</div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleDirectCreateSpaceAndImport}
                >
                  克隆模组
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
      </PopWindow>
      {/* 在现有的 PopWindow 组件后面添加确认弹窗 */}
      <PopWindow isOpen={showConfirmPopup} onClose={handleCancelNavigate}>
        <div className="flex flex-col items-center p-6 gap-4">
          <div className="text-2xl font-bold text-success">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            空间创建成功！
          </div>

          <p className="text-center text-gray-600">
            仓库已成功导入到新空间
            <br />
            <span className="font-semibold">{repositoryData.repositoryName}</span>
          </p>

          <div className="flex gap-4 mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleCancelNavigate}
            >
              稍后查看
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNavigateToNewSpace}
            >
              立即前往
            </button>
          </div>
        </div>
      </PopWindow>
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
          ✅ 克隆成功！
        </div>
      )}
      {showErrorToast && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50 fade-in-out">
          ❌ 克隆失败！
        </div>
      )}
    </>
  );
}
