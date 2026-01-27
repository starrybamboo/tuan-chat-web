import { BookmarkSimpleIcon, CaretRightIcon, GameControllerIcon } from "@phosphor-icons/react";
import { useGetSpaceInfoQuery, useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useGetSpaceModuleRoleQuery } from "api/hooks/spaceModuleHooks";
import { useGetSpaceSidebarTreeQuery } from "api/hooks/spaceSidebarTreeHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import { parseSidebarTree } from "@/components/chat/room/sidebarTree";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";
import { useDocHeaderOverrideStore } from "@/components/chat/stores/docHeaderOverrideStore";
import { ArticleIcon, BookOpenTextIcon, CardsIcon, ChevronRightIcon, DiceFiveIcon, FolderIcon, GearOutline, GraphIcon } from "@/icons";

export function meta() {
  return [
    { title: "空间预览" },
    { name: "description", content: "Space preview" },
  ];
}

interface DocItem {
  id: string;
  title: string;
}

export default function SpacePreview() {
  const navigate = useNavigate();
  const params = useParams();
  const rawSpaceId = Number(params.spaceId ?? -1);
  const spaceId = Number.isFinite(rawSpaceId) ? rawSpaceId : -1;

  const spaceQuery = useGetSpaceInfoQuery(spaceId);
  const space = spaceQuery.data?.data;
  const roomsQuery = useGetUserRoomsQuery(spaceId);
  const rooms = roomsQuery.data?.data?.rooms ?? [];
  const spaceOwnerQuery = useGetUserInfoQuery(space?.userId ?? -1);
  const spaceOwner = spaceOwnerQuery.data?.data;
  const sidebarTreeQuery = useGetSpaceSidebarTreeQuery(spaceId);
  const sidebarTree = useMemo(() => {
    return parseSidebarTree(sidebarTreeQuery.data?.data?.treeJson);
  }, [sidebarTreeQuery.data?.data?.treeJson]);
  const spaceRolesQuery = useGetSpaceModuleRoleQuery(spaceId);
  const docHeaderOverrides = useDocHeaderOverrideStore(state => state.headers);

  const docItems = useMemo<DocItem[]>(() => {
    const list: DocItem[] = [];
    const seen = new Set<string>();
    for (const cat of sidebarTree?.categories ?? []) {
      for (const node of cat?.items ?? []) {
        if (node?.type !== "doc")
          continue;
        const id = typeof node.targetId === "string" ? node.targetId : "";
        if (!id || seen.has(id))
          continue;
        seen.add(id);
        list.push({ id, title: node.fallbackTitle ?? `文档 ${id.slice(0, 6)}` });
      }
    }
    return list;
  }, [sidebarTree]);

  const npcRoles = Array.isArray(spaceRolesQuery.data?.data) ? spaceRolesQuery.data?.data : [];
  const [isFavorited, setIsFavorited] = useState(false);
  const [isKpMode, setIsKpMode] = useState(true);
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [isSpaceDocCollapsed, setIsSpaceDocCollapsed] = useState(false);
  const floatingCardClass = "card-sm md:card-xl bg-base-100 shadow-xs rounded-xl md:border-2 md:border-base-content/10";
  const timelineCardClass = `${floatingCardClass} bg-slate-50 dark:bg-slate-800`;

  useEffect(() => {
    useDocHeaderOverrideStore.getState().hydrateFromLocalStorage();
  }, []);

  const spaceName = space?.name ?? (spaceId > 0 ? `空间 #${spaceId}` : "未知空间");
  const spaceDescription = space?.description ?? "暂无空间简介";
  const spaceAvatar = space?.avatar ?? "/moduleDefaultImage.webp";
  const ownerAvatar = spaceOwner?.avatarThumbUrl ?? spaceOwner?.avatar ?? "/logo.svg";
  const ownerName = spaceOwner?.username ?? (space?.userId ? `用户 ${space.userId}` : "未知作者");
  const roomCount = rooms.length;
  const docCount = docItems.length;
  const npcCount = npcRoles.length;
  const activeRooms = rooms.filter(room => room?.status !== 1);

  if (spaceId <= 0) {
    return (
      <div className="min-h-full w-full flex items-center justify-center p-6">
        <div className={`${floatingCardClass} max-w-md w-full`}>
          <div className="card-body text-center">
            <h2 className="card-title justify-center">无法打开空间预览</h2>
            <p className="text-sm text-base-content/60">空间参数无效，请从聊天室重新进入。</p>
            <div className="card-actions justify-center">
              <button className="btn btn-primary" type="button" onClick={() => navigate("/chat")}>返回聊天室</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full w-full flex-col bg-base-100">
      <div className="w-full">
        <div className="flex items-center gap-2 min-w-0 h-10 border-b border-t border-gray-300 dark:border-gray-700 px-2">
          <span className="text-base font-bold truncate leading-none min-w-0 flex-1">
            模组预览 ·
            {" "}
            {spaceName}
          </span>
          {space?.status === 2 && (
            <span className="badge badge-sm">已归档</span>
          )}

          <div className="hidden lg:block h-10 border-b border-gray-300 dark:border-gray-700" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-6 pt-4 md:px-8 md:pb-10 md:pt-6">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <div className={`${floatingCardClass} relative overflow-hidden`}>
                <img src={spaceAvatar} alt={spaceName} className="aspect-square w-full object-cover" />
                {space?.status === 2 && (
                  <div className="absolute left-4 top-4 rounded-full  px-3 py-1 text-xs tracking-wide">已归档</div>
                )}
              </div>

              <div className="space-y-3">
                <h1 className="text-2xl font-semibold md:text-3xl">{spaceName}</h1>
                <p className="text-sm leading-relaxed text-base-content/60">{spaceDescription}</p>
              </div>

              <div className="divider" />

              <div>
                <div className="grid grid-cols-3 gap-2 ">
                  <button
                    type="button"
                    className={`btn btn-sm rounded-md ${isKpMode ? "btn-info" : "btn-outline"}`}
                    onClick={() => setIsKpMode(prev => !prev)}
                  >
                    {isKpMode ? "KP 模式" : "PL 模式"}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-md ${isFavorited ? "btn-success" : "btn-outline"}`}
                    onClick={() => setIsFavorited(prev => !prev)}
                  >
                    <BookmarkSimpleIcon className="size-4" weight={isFavorited ? "fill" : "regular"} />
                    {isFavorited ? "已收藏" : "收藏"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary rounded-md"
                    onClick={() => navigate(`/chat/${spaceId}`)}
                  >
                    <GameControllerIcon className="size-4" />
                    游玩
                  </button>
                </div>
              </div>
              <div className={`${floatingCardClass} p-2`}>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full border ">
                    <img src={ownerAvatar} alt={ownerName} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{ownerName}</div>
                    <div className="text-xs ">空间作者</div>
                  </div>
                </div>
              </div>

              <div className={`${floatingCardClass}`}>
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <GearOutline className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">当前规则</h3>
                        <p className="text-primary font-medium text-sm">未选择规则</p>
                      </div>
                    </div>
                    <div className="text-xs text-base-content/50">规则</div>
                  </div>
                </div>
              </div>

              <div className={`${floatingCardClass} transition-all duration-200`}>
                <div className="card-body p-4">
                  <div className="flex items-center justify-between cursor-pointer hover:bg-base-300 rounded-xl p-2 -m-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <DiceFiveIcon className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">空间骰娘</h3>
                        <p className="text-accent font-medium text-sm">选择使用的骰娘角色</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-base-content/50">
                      <span className="text-xs">设置</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            <main className="space-y-6">
              <section>
                <ul className="timeline timeline-snap-icon timeline-compact timeline-vertical mt-2">
                  <li>
                    <div className="timeline-middle">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 shadow-sm">
                        <GraphIcon className="size-5 " />
                      </div>
                    </div>
                    <div className="timeline-end w-full">
                      <div className="flex min-h-10 items-center justify-between gap-3 text-base font-semibold leading-9">
                        <span>空间资料</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setIsSpaceDocCollapsed(prev => !prev)}
                        >
                          <span className="flex items-center gap-1">
                            {isSpaceDocCollapsed
                              ? <ArticleIcon className="size-4" />
                              : <CardsIcon className="size-4" />}
                            {isSpaceDocCollapsed ? "展开全文" : "收起为卡片"}
                          </span>
                        </button>
                      </div>
                      {isSpaceDocCollapsed
                        ? (
                            <div className={`card card-side ${timelineCardClass} mt-4 mb-8`}>
                              <figure className="size-40 shrink-0 overflow-hidden">
                                <img
                                  src={spaceAvatar}
                                  alt={spaceName}
                                  className="h-full w-full object-cover"
                                />
                              </figure>
                              <div className="card-body p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="text-base font-semibold">{spaceName}</div>
                                    <div className="text-xs ">
                                      Space ID ·
                                      {spaceId}
                                    </div>
                                  </div>
                                  <div className="rounded-full border px-3 py-1 text-xs ">Root Document</div>
                                </div>
                                <p className="mt-3 text-sm  line-clamp-3 text-base-content/60">{spaceDescription}</p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs ">
                                  <span>
                                    房间
                                    {roomCount}
                                  </span>
                                  <span>·</span>
                                  <span>
                                    文档
                                    {docCount}
                                  </span>
                                  <span>·</span>
                                  <span>
                                    NPC
                                    {npcCount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        : (
                            <div className={`${timelineCardClass} mt-4 mb-8`}>
                              <div className="max-h-[70vh] overflow-y-auto">
                                <BlocksuiteDescriptionEditor
                                  workspaceId={`space:${spaceId}`}
                                  spaceId={spaceId}
                                  docId={buildSpaceDocId({ kind: "space_description", spaceId })}
                                  variant="embedded"
                                  mode="page"
                                  allowModeSwitch={false}
                                  fullscreenEdgeless={false}
                                  readOnly={true}
                                  tcHeader={{ enabled: true, fallbackTitle: spaceName, fallbackImageUrl: spaceAvatar }}
                                />
                              </div>
                            </div>
                          )}
                    </div>
                    <hr />
                  </li>

                  <li>
                    <hr />
                    <div className="timeline-middle">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 shadow-sm">
                        <FolderIcon className="size-5 " />
                      </div>
                    </div>
                    <div className="timeline-end w-full">
                      <div className="flex min-h-10 items-center gap-2 leading-9">
                        <div className="text-base font-semibold">房间资料</div>
                        <div className="divider divider-start flex-1" />
                        <div className="rounded-full border  px-3 py-1 text-xs ">
                          {roomCount}
                          {" "}
                          Rooms
                        </div>
                      </div>
                      <div className="mt-3 space-y-3 mb-8">
                        {activeRooms.slice(0, showAllRooms ? activeRooms.length : 4).map(room => (
                          <div key={room.roomId ?? room.name} className={`flex items-start gap-4 ${timelineCardClass} p-4`}>
                            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-base-200">
                              {room?.avatar
                                ? (
                                    <img
                                      src={room.avatar}
                                      alt={room.name ?? "room"}
                                      className="h-full w-full object-cover"
                                    />
                                  )
                                : (
                                    <div className="flex h-full w-full items-center justify-center text-base-content/50">
                                      <GameControllerIcon className="size-5" />
                                    </div>
                                  )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold ">{room.name ?? `房间 ${room.roomId}`}</div>
                              <div className="text-xs line-clamp-2 text-base-content/60">{room.description ?? "暂无房间描述"}</div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 self-center">
                              <div className="rounded-full border px-3 py-1 text-xs ">
                                {room.roomType === 2 ? "公共房间" : "游戏房间"}
                              </div>
                              <CaretRightIcon className="size-4 text-base-content/50" />
                            </div>
                          </div>
                        ))}
                        {roomCount > 4 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm w-full"
                            onClick={() => setShowAllRooms(prev => !prev)}
                          >
                            {showAllRooms
                              ? "收起房间列表"
                              : `还有 ${roomCount - 4} 个房间未展示，点击展开`}
                          </button>
                        )}
                        {roomCount === 0 && (
                          <div className={`${timelineCardClass} p-4 text-sm text-base-content/60`}>暂无房间数据</div>
                        )}
                      </div>
                    </div>
                    <hr />
                  </li>

                  <li>
                    <hr />
                    <div className="timeline-middle">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 shadow-sm">
                        <BookOpenTextIcon className="size-5 " />
                      </div>
                    </div>
                    <div className="timeline-end w-full">
                      <div className="flex min-h-10 items-center gap-2 text-base font-semibold leading-9">
                        <span>文档集合 · NPC 集合</span>
                        <div className="divider divider-start flex-1" />
                      </div>
                      <div className="mt-3 grid gap-4 lg:grid-cols-2 mb-8">
                        <div className={`${timelineCardClass} p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">文档集合</div>
                            <div className="text-xs ">
                              {docCount}
                              {" "}
                              Docs
                            </div>
                          </div>
                          <div className="mt-3 space-y-2 text-sm">
                            {docItems.slice(0, 5).map((doc) => {
                              const docOverride = docHeaderOverrides[doc.id];
                              const docOverrideTitle = typeof docOverride?.title === "string" ? docOverride.title.trim() : "";
                              const docOverrideImageUrl = typeof docOverride?.imageUrl === "string" ? docOverride.imageUrl.trim() : "";
                              const docTitle = docOverrideTitle || doc.title;

                              return (
                                <div key={doc.id} className={`flex items-center gap-3 ${timelineCardClass} px-3 py-2`}>
                                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-base-200 flex items-center justify-center">
                                    {docOverrideImageUrl
                                      ? (
                                          <img
                                            src={docOverrideImageUrl}
                                            alt={docTitle}
                                            className="h-full w-full object-cover"
                                          />
                                        )
                                      : (
                                          <ArticleIcon className="size-5 text-base-content/50" />
                                        )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold">{docTitle}</div>
                                    <div className="text-xs text-base-content/60">
                                      #
                                      {doc.id.slice(0, 6)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {docCount === 0 && (
                              <div className={`${timelineCardClass} px-3 py-2 text-sm text-base-content/60`}>暂无文档</div>
                            )}
                          </div>
                        </div>

                        <div className={`${timelineCardClass} p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">NPC 集合</div>
                            <div className="text-xs ">
                              {npcCount}
                              {" "}
                              NPCs
                            </div>
                          </div>
                          <div className="mt-3 space-y-2 text-sm">
                            {npcRoles.slice(0, 5).map((role, index) => (
                              <div key={role.roleId ?? index} className={`flex items-center justify-between ${timelineCardClass} px-3 py-2`}>
                                <span className="truncate">
                                  NPC 角色
                                  {role.roleId ?? "-"}
                                </span>
                                <span className="text-xs">角色</span>
                              </div>
                            ))}
                            {npcCount === 0 && (
                              <div className={`${timelineCardClass} px-3 py-2 text-sm text-base-content/60`}>暂无 NPC</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                </ul>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
