import type { UserRole } from "api";
import type { Role } from "../types";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteRolesMutation, useGetInfiniteUserRolesByTypeQuery, useGetUserRolesByTypeQuery } from "api/hooks/RoleAndAvatarHooks";
// import { useCreateRoleMutation, useDeleteRolesMutation, useGetInfiniteUserRolesQuery, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { tuanchat } from "@/../api/instance";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { getRoleRule } from "@/utils/roleRuleStorage";
import { useGlobalContext } from "../../globalContextProvider";
import { RoleListItem } from "./RoleListItem";

// ... SidebarProps 接口不再需要 setSelectedRoleId 和 onEnterCreateEntry
interface SidebarProps {
  roles: Role[]; // 角色数据数组
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  selectedRoleId: number | null;
  // setSelectedRoleId: (id: number | null) => void;
  // setIsEditing: (value: boolean) => void;
  // onEnterCreateEntry?: () => void; // 进入创建入口（显示 CreateEntry）
}

export function Sidebar({
  roles,
  setRoles,
  selectedRoleId,
  // setSelectedRoleId,
  // setIsEditing,
  // onEnterCreateEntry,
}: SidebarProps) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // 已不再直接在 Sidebar 内创建角色
  const [searchQuery, setSearchQuery] = useState("");
  // 折叠状态：用于"全部"视图中的分组折叠
  const [isDiceCollapsed, setIsDiceCollapsed] = useState(false);
  const [isNormalCollapsed, setIsNormalCollapsed] = useState(false);
  // 获取用户数据
  const userId = useGlobalContext().userId;
  const diceRolesQuery = useGetUserRolesByTypeQuery(userId ?? -1, 1);
  const {
    data: normalRolesQuery,
    isSuccess: isNormalSuccess,
    fetchNextPage,
    // isFetchingNextPage,
    hasNextPage,
    // status,
  } = useGetInfiniteUserRolesByTypeQuery(userId ?? -1, 0);
  // 创建角色接口
  // const { mutateAsync: createRole } = useCreateRoleMutation();
  // 上传头像接口
  // const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  // 删除角色接口
  const { mutate: deleteRole } = useDeleteRolesMutation();
  // 更新角色接口
  // const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave);

  // 删除弹窗状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  // 删除角色
  const handleDelete = (id: number) => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(id);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  const loadRoles = async () => {
    const convertRole = (role: UserRole) => ({
      id: role.roleId || 0,
      name: role.roleName || "",
      description: role.description || "无描述",
      avatar: "",
      avatarId: role.avatarId || 0,
      modelName: role.modelName || "",
      speakerName: role.speakerName || "",
      voiceUrl: role.voiceUrl || undefined, // 添加 voiceUrl 字段
      // 透传类型，便于侧边栏分类（若后端无该字段则为 0）
      type: (role as unknown as { type?: number; diceMaiden?: boolean }).type
        ?? (((role as unknown as { diceMaiden?: boolean }).diceMaiden) ? 1 : 0),
      extra: role.extra || {}, // 添加 extra 字段
    });

    // 有query数据时
    const diceUserRoles = diceRolesQuery.data ?? [];
    const normalUserRoles = normalRolesQuery?.pages.flatMap(page => page.data?.list ?? []) ?? [];
    if (diceUserRoles.length > 0 || normalUserRoles.length > 0) {
      // 将API返回的角色数据映射为前端使用的格式
      const mappedRoles = [...diceUserRoles, ...normalUserRoles].map(convertRole);
      const filteredMappedRoles = mappedRoles.filter(role => role.type !== 2);
      // 将映射后的角色数据设置到状态中
      setRoles((prev) => {
        const filteredPrev = prev.filter(role => role.type !== 2);
        // 如果存在旧角色数据，需要过滤掉重复的角色，这也避免了头像数据的重复加载
        const existingIds = new Set(filteredPrev.map(r => r.id));
        const newRoles = filteredMappedRoles.filter(
          role => !existingIds.has(role.id),
        );
        return [...filteredPrev, ...newRoles];
      });

      // 并行加载所有角色的头像
      const avatarPromises = filteredMappedRoles.map(async (role) => {
        // 检查角色的头像是否已经缓存
        const cachedAvatar = queryClient.getQueryData<string>(["roleAvatar", role.id]);
        if (cachedAvatar) {
          return { id: role.id, avatar: cachedAvatar };
        }

        try {
          // 如果角色没有avatarId，跳过头像加载
          if (!role.avatarId) {
            console.warn(`角色 ${role.id} 没有avatarId，跳过头像加载`);
            return null;
          }

          const res = await tuanchat.avatarController.getRoleAvatar(role.avatarId);
          if (res.success && res.data) {
            const avatarUrl = res.data.avatarUrl;
            // 将头像URL缓存到React Query缓存中
            queryClient.setQueryData(["roleAvatar", role.id], avatarUrl);
            return { id: role.id, avatar: avatarUrl };
          }
          console.warn(`角色 ${role.id} 的头像数据无效或为空，avatarId: ${role.avatarId}`);
          return null;
        }
        catch (error) {
          console.error(`加载角色 ${role.id} 的头像时出错`, error);
          return null;
        }
      });

      // 等待所有头像加载完成并一次性更新状态
      const avatarResults = await Promise.all(avatarPromises);
      const validAvatars = avatarResults.filter(result => result !== null);

      if (validAvatars.length > 0) {
        setRoles((prevChars) => {
          return prevChars.map((char) => {
            const avatarData = validAvatars.find(avatar => avatar?.id === char.id);
            return avatarData ? { ...char, avatar: avatarData.avatar } : char;
          });
        });
      }
    }
  };

  // 添加加载更多角色的函数
  const loadMoreRoles = useCallback(async () => {
    if (isLoadingMore || !hasNextPage)
      return;

    setIsLoadingMore(true);
    await fetchNextPage();
    setIsLoadingMore(false);
  }, [fetchNextPage, hasNextPage, isLoadingMore]);

  // 创建新角色
  // const handleCreate = async () => {
  //   if (isCreatingRole)
  //     return; // 防止重复点击

  //   setIsCreatingRole(true);
  //   try {
  //     const data = await createRole({ roleName: "新角色", description: "新角色描述" });
  //     if (data === undefined) {
  //       console.error("角色创建失败");
  //       return;
  //     }
  //     const res = await uploadAvatar({
  //       avatarUrl: "/favicon.ico",
  //       spriteUrl: "/favicon.ico",
  //       roleId: data,
  //     });
  //     if (res?.data?.avatarId) {
  //       const newRole: Role = {
  //         id: data,
  //         name: "新角色",
  //         description: "新角色描述",
  //         avatar: res.data.avatarUrl,
  //         avatarId: res.data.avatarId,
  //         modelName: "散华",
  //         speakerName: "鸣潮",
  //       };
  //       setRoles(prev => [newRole, ...prev]);
  //       setSelectedRoleId(newRole.id);
  //       updateRole(newRole);
  //     }
  //   }
  //   catch (error) {
  //     console.error("创建角色时发生错误:", error);
  //   }
  //   finally {
  //     setIsCreatingRole(false);
  //   }
  // };

  // 进入创建入口：清空当前选中角色并通知上层展示 CreateEntry
  // const handleCreate = () => {
  //   setSelectedRoleId(null);
  //   setIsEditing(false);
  //   onEnterCreateEntry?.();
  //   // 关闭抽屉（移动端）
  //   const drawerCheckbox = document.getElementById("character-drawer") as HTMLInputElement | null;
  //   if (drawerCheckbox)
  //     drawerCheckbox.checked = false;
  // };

  const closeDrawerOnMobile = () => {
    const drawerCheckbox = document.getElementById("character-drawer") as HTMLInputElement | null;
    if (drawerCheckbox)
      drawerCheckbox.checked = false;
  };

  // 初始化角色数据
  useEffect(() => {
    if (diceRolesQuery.isSuccess || isNormalSuccess) {
      loadRoles();
    }
    // 监听 roleQuery.pages 的变化，当 infinite query 加载新页面时也会触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceRolesQuery.data?.length, isNormalSuccess, normalRolesQuery?.pages.length]);
  // 过滤角色列表（按搜索）
  const filteredRoles = roles
    .filter(role => role.name.toLowerCase().includes(searchQuery.toLowerCase())
      || role.description.toLowerCase().includes(searchQuery.toLowerCase()));

  // 在"全部"视图中，分离骰娘角色和普通角色
  const diceRoles = filteredRoles.filter(role => role.type === 1);
  const normalRoles = filteredRoles.filter(role => role.type !== 1);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(() => new Set());

  // 切换选择模式
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedRoles(new Set());
  };

  // 切换角色选择状态
  const toggleRoleSelection = (roleId: number) => {
    setSelectedRoles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(roleId)) {
        newSelection.delete(roleId);
      }
      else {
        newSelection.add(roleId);
      }
      return newSelection;
    });
  };

  // 批量删除角色
  const handleBatchDelete = () => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(null);
  };

  const navigate = useNavigate();

  // 删除确认处理函数
  const handleConfirmDelete = async () => {
    if (deleteCharacterId !== null) {
      // 单个删除逻辑
      const roleId = deleteCharacterId;
      if (roleId) {
        // 更新状态
        setRoles(roles.filter(c => c.id !== roleId));
        deleteRole([roleId]);
      }
    }
    else if (selectedRoles.size > 0) {
      // 批量删除逻辑
      const roleIds = Array.from(selectedRoles);
      // 更新状态
      setRoles(roles.filter(c => !selectedRoles.has(c.id)));
      deleteRole(roleIds);
      setSelectedRoles(new Set());
      setIsSelectionMode(false);
    }

    // 关闭弹窗
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  useEffect(() => {
    // 只有当角色列表已加载（非空）且选中的角色不存在时才跳转
    // 避免在初始加载时（roles 为空）错误触发跳转
    if (roles.length > 0 && selectedRoleId && !roles.find(c => c.id === selectedRoleId)) {
      // 当前选中角色被删掉了，跳转
      navigate("/role", { replace: true });
    }
  }, [roles, selectedRoleId, navigate]);

  return (
    <>

      <div className="menu p-4 w-72 lg:w-80 h-full bg-base-200 md:bg-base-300/40 flex flex-col border-t border-gray-300 dark:border-gray-700">
        {/* 搜索和创建区域 - 固定在顶部 */}
        <div className="flex gap-2 sticky top-0 bg-transparent z-50 py-2">
          <label className="input">
            <svg className="h-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2.5"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </g>
            </svg>
            <input
              type="text"
              className="grow"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </label>
          {isSelectionMode
            ? (
                <>
                  <button
                    type="button"
                    className={`btn btn-error btn-square ${selectedRoles.size === 0 ? "btn-disabled" : ""}`}
                    onClick={handleBatchDelete}
                    title="删除所选角色"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-square"
                    onClick={toggleSelectionMode}
                    title="退出选择模式"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )
            : (
                <>
                  <button
                    type="button"
                    className="btn btn-square btn-soft bg-base-200"
                    onClick={toggleSelectionMode}
                    title="进入选择模式"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </button>
                </>
              )}
        </div>
        {/* 分类切换移除，仅保留全部视图 */}

        {/* 创建角色 - 虚线占位项，始终位于列表顶部 */}

        {/* 角色列表 - 使用 InfiniteQuery */}
        <div className="flex-1 overflow-hidden">

          <div
            className="h-full overflow-y-auto"
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              // 当滚动到底部附近时加载更多
              if (scrollHeight - scrollTop <= clientHeight + 100) {
                loadMoreRoles();
              }
            }}
          >
            {/* "全部"视图：分组可折叠列表，骰娘在前，普通角色在后 */}
            <>
              {/* 骰娘角色分组 */}
              <div className="mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-100 transition-colors"
                  onClick={() => setIsDiceCollapsed(!isDiceCollapsed)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${isDiceCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="font-medium">骰娘角色</span>
                  <span className="text-xs text-base-content/60">
                    (
                    {diceRoles.length}
                    )
                  </span>
                </button>
                {!isDiceCollapsed && (
                  <div className="ml-2">
                    {/* 创建骰娘入口 */}
                    <Link
                      to="/role?type=dice"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
                      onClick={closeDrawerOnMobile}
                      title="创建骰娘角色"
                    >
                      <div className="avatar shrink-0 px-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-success/40 group-hover:border-success/60 bg-success/5 text-success/60 group-hover:text-success/80 transition-colors duration-150 relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <circle cx="15.5" cy="8.5" r="1.5" />
                            <circle cx="8.5" cy="15.5" r="1.5" />
                            <circle cx="15.5" cy="15.5" r="1.5" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium truncate">创建骰娘</h3>
                        <p className="text-xs text-base-content/70 mt-1 truncate">创建跑团骰娘</p>
                      </div>
                    </Link>
                    {/* 骰娘角色列表 */}
                    {diceRoles.map((role) => {
                      const storedRuleId = getRoleRule(role.id) || 1;
                      const roleUrl = `/role/${role.id}?rule=${storedRuleId}`;
                      return (
                        <NavLink
                          key={role.id}
                          to={roleUrl}
                          className={({ isActive }) => `block rounded-lg px-1 ${
                            isActive && !isSelectionMode ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={(e) => {
                            if (isSelectionMode) {
                              e.preventDefault();
                              toggleRoleSelection(role.id);
                            }
                            else {
                              closeDrawerOnMobile();
                            }
                          }}
                        >
                          <RoleListItem
                            role={role}
                            isSelected={isSelectionMode ? selectedRoles.has(role.id) : selectedRoleId === role.id}
                            onDelete={() => handleDelete(role.id)}
                            isSelectionMode={isSelectionMode}
                          />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 普通角色分组 */}
              <div className="mb-2">
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-base-100 transition-colors"
                  onClick={() => setIsNormalCollapsed(!isNormalCollapsed)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 transition-transform ${isNormalCollapsed ? "" : "rotate-90"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <span className="font-medium">普通角色</span>
                  <span className="text-xs text-base-content/60">
                    (
                    {normalRoles.length}
                    )
                  </span>
                </button>
                {!isNormalCollapsed && (
                  <div className="ml-2">
                    {/* 创建普通角色入口 */}
                    <Link
                      to="/role?type=normal"
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
                      onClick={closeDrawerOnMobile}
                      title="创建普通角色"
                    >
                      <div className="avatar shrink-0 px-1">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-primary/40 group-hover:border-primary/60 bg-primary/5 text-primary/60 group-hover:text-primary/80 transition-colors duration-150 relative">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-7 h-7 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="font-medium truncate">创建普通角色</h3>
                        <p className="text-xs text-base-content/70 mt-1 truncate">创建普通游戏角色</p>
                      </div>
                    </Link>
                    {/* 普通角色列表 */}
                    {normalRoles.map((role) => {
                      const storedRuleId = getRoleRule(role.id) || 1;
                      const roleUrl = `/role/${role.id}?rule=${storedRuleId}`;
                      return (
                        <NavLink
                          key={role.id}
                          to={roleUrl}
                          className={({ isActive }) => `block rounded-lg px-1 ${
                            isActive && !isSelectionMode ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={(e) => {
                            if (isSelectionMode) {
                              e.preventDefault();
                              toggleRoleSelection(role.id);
                            }
                            else {
                              closeDrawerOnMobile();
                            }
                          }}
                        >
                          <RoleListItem
                            role={role}
                            isSelected={isSelectionMode ? selectedRoles.has(role.id) : selectedRoleId === role.id}
                            onDelete={() => handleDelete(role.id)}
                            isSelectionMode={isSelectionMode}
                          />
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            </>

            {isLoadingMore && (
              <div className="flex justify-center items-center py-4">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ToastWindow isOpen={deleteConfirmOpen} onClose={handleCancelDelete}>
        <div className="card flex flex-col w-full max-w-md">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-2xl font-bold">确认删除角色</h2>
            <div className="divider"></div>
            <p className="text-lg opacity-75 mb-8">
              {deleteCharacterId !== null
                ? "确定要删除这个角色吗？"
                : `确定要删除选中的 ${selectedRoles.size} 个角色吗？`}
            </p>
          </div>
        </div>
        <div className="card-actions justify-center gap-6 mt-8">
          <button type="button" className="btn btn-outline" onClick={handleCancelDelete}>
            取消
          </button>
          <button type="button" className="btn btn-error" onClick={handleConfirmDelete}>
            删除
          </button>
        </div>
      </ToastWindow>
    </>
  );
}
