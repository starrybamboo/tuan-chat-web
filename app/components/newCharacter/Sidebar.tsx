import type { UserRole } from "api";
import type { Role } from "./types";
import { tuanchat } from "@/../api/instance";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteRolesMutation, useGetInfiniteUserRolesQuery } from "api/queryHooks";
// import { useCreateRoleMutation, useDeleteRolesMutation, useGetInfiniteUserRolesQuery, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router";
import { PopWindow } from "../common/popWindow";
import { useGlobalContext } from "../globalContextProvider";
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
  // 获取用户数据
  const userId = useGlobalContext().userId;
  const {
    data: roleQuery,
    isSuccess,
    fetchNextPage,
    // isFetchingNextPage,
    hasNextPage,
    // status,
  } = useGetInfiniteUserRolesQuery(userId ?? -1);
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
    });

    // 有query数据时
    if (isSuccess && roleQuery.pages.length > 0) {
      // 将API返回的角色数据映射为前端使用的格式
      const mappedRoles = roleQuery?.pages.flatMap(page =>
        (page.data?.list ?? []).map(convertRole),
      ) ?? [];
      // 将映射后的角色数据设置到状态中
      setRoles((prev) => {
        // 如果存在旧角色数据，需要过滤掉重复的角色，这也避免了头像数据的重复加载
        const existingIds = new Set(prev.map(r => r.id));
        const newRoles = mappedRoles.filter(
          role => !existingIds.has(role.id),
        );
        return [...prev, ...newRoles];
      });

      // 并行加载所有角色的头像
      const avatarPromises = mappedRoles.map(async (role) => {
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
    if (isSuccess) {
      loadRoles();
    }
    // 仅在 isSuccess 变化时触发，loadRoles 是稳定引用（未放入依赖防止无限循环）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);
  // 过滤角色列表
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
    || role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(new Set());

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
  const [searchParams] = useSearchParams();

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
    if (selectedRoleId && !roles.find(c => c.id === selectedRoleId)) {
      // 当前选中角色被删掉了，跳转
      navigate("/role", { replace: true });
    }
  }, [roles, selectedRoleId, navigate]);

  return (
    <>

      <div className="menu p-4 w-72 lg:w-80 h-full bg-base-200 md:bg-base-300/40 flex flex-col">
        {/* 搜索和创建区域 - 固定在顶部 */}
        <div className="flex gap-2 mb-4 sticky top-0 bg-transparent z-50 py-2">
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
            <Link
              to="/role"
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer group hover:bg-base-100 transition-all duration-150"
              onClick={closeDrawerOnMobile} // 仅用于关闭移动端抽屉
              title="进入创建入口"
            >
              <div className="avatar shrink-0">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-base-content/40 group-hover:border-base-content/60 bg-base-200/70 text-base-content/40 group-hover:text-base-content/60 transition-colors duration-150 relative">
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
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-medium truncate">创建角色</h3>
                <p className="text-xs text-base-content/70 mt-1 truncate">进入创建入口</p>
              </div>
            </Link>
            {filteredRoles.map((role) => {
              // 构建保留当前查询参数的 URL
              const roleUrl = `/role/${role.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

              return (
                <NavLink
                  key={role.id}
                  to={roleUrl}
                  // NavLink 让我们能根据路由是否激活来动态设置 className
                  className={({ isActive }) => `block rounded-lg ${isActive && !isSelectionMode ? "bg-primary text-primary/80" : ""}`}
                  onClick={(e) => {
                    // 如果是批量选择模式，阻止导航
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
                    // isSelected 现在由 NavLink 的 isActive 状态或批量选择状态决定
                    isSelected={isSelectionMode ? selectedRoles.has(role.id) : selectedRoleId === role.id}
                    // --- REMOVED --- onSelect prop
                    onDelete={(_e) => {
                      // 事件已经在 RoleListItem 内部被阻止了，这里只需要处理删除逻辑
                      handleDelete(role.id);
                    }}
                    isSelectionMode={isSelectionMode}
                  // 如果 isSelectionMode，需要一种方式来触发 toggleRoleSelection
                  // 我们在 NavLink 的 onClick 中处理了这个逻辑
                  />
                </NavLink>
              );
            })}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-4">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <PopWindow isOpen={deleteConfirmOpen} onClose={handleCancelDelete}>
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
      </PopWindow>
    </>
  );
}
