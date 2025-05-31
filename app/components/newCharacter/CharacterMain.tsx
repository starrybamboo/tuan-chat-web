import type { RoleResponse } from "api";
import type { Role } from "./types";
import { tuanchat } from "@/../api/instance";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateRoleMutation, useDeleteRolesMutation, useGetInfiniteUserRolesQuery, useUploadAvatarMutation } from "api/queryHooks";
import { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { useGlobalContext } from "../globalContextProvider";
import CharacterDetail from "./CharacterDetail";

export default function CharacterMain() {
  // 获取用户数据
  const userId = useGlobalContext().userId;
  const {
    data: roleQuery,
    isSuccess,
    // fetchNextPage,
    // isFetchingNextPage,
    // hasNextPage,
    // status,
  } = useGetInfiniteUserRolesQuery(userId ?? -1);

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const initializeRoles = async () => {
    const convertRole = (role: RoleResponse) => ({
      id: role.roleId || 0,
      name: role.roleName || "",
      description: role.description || "无描述",
      avatar: "",
      avatarId: role.avatarId || 0,
      modelName: role.modelName || "",
      speakerName: role.speakerName || "",
    });

    setIsLoading(true);
    try {
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

        // 异步加载每个角色的头像
        for (const Roles of mappedRoles) {
          // 检查角色的头像是否已经缓存
          const cachedAvatar = queryClient.getQueryData<string>(["roleAvatar", Roles.id]);
          if (cachedAvatar) {
            return;
          }

          try {
            const res = await tuanchat.avatarController.getRoleAvatar(Roles.avatarId);
            if (
              res.success
              && res.data
            ) {
              const avatarUrl = res.data.avatarUrl;
              // 将头像URL缓存到React Query缓存中
              queryClient.setQueryData(["roleAvatar", Roles.id], avatarUrl);
              // 更新角色列表中对应角色的头像URL
              setRoles(prevChars =>
                prevChars.map(char =>
                  char.id === Roles.id ? { ...char, avatar: avatarUrl } : char,
                ),
              );
            }
            else {
              console.warn(`角色 ${Roles.id} 的头像数据无效或为空`);
            }
          }
          catch (error) {
            console.error(`加载角色 ${Roles.id} 的头像时出错`, error);
          }
        }
      }
    }
    finally {
      setIsLoading(false);
    }
  };

  // const { roles, initializeRoles, setRoles, isLoading } = useRolesInitialization(roleQuery);

  // 状态管理
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 创建角色接口
  const { mutateAsync: createRole } = useCreateRoleMutation();
  // 删除角色接口
  const { mutate: deleteRole } = useDeleteRolesMutation();
  // 上传头像接口
  const { mutate: uploadAvatar } = useUploadAvatarMutation();

  // 初始化角色数据
  useEffect(() => {
    if (isSuccess) {
      initializeRoles();
    }
  }, [isSuccess, roleQuery]);

  // 删除弹窗状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);

  // 创建新角色
  const handleCreate = async () => {
    const data = await createRole();
    if (data === undefined) {
      console.error("角色创建失败");
      return;
    }
    const newRole: Role = {
      id: data,
      name: "",
      description: "",
      avatar: "",
      avatarId: 0,
      modelName: "散华",
      speakerName: "鸣潮",
    };
    uploadAvatar({
      avatarUrl: "/favicon.ico",
      spriteUrl: "/favicon.ico",
      roleId: data,
    });
    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setIsEditing(true);
  };

  // 保存角色
  const handleSave = (updatedRole: Role) => {
    setRoles(prev =>
      prev.map(role =>
        role.id === updatedRole.id ? updatedRole : role,
      ),
    );
    setIsEditing(false);
    setSelectedRoleId(updatedRole.id);
  };

  // 删除角色
  const handleDelete = (id: number) => {
    setDeleteConfirmOpen(true);
    setDeleteCharacterId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteCharacterId !== null) {
      const roleId = deleteCharacterId;
      if (roleId) {
        setRoles(roles.filter(c => c.id !== roleId));
        setSelectedRoleId(null);
        deleteRole([roleId]);
      }
      else {
        console.error("无法获取角色ID");
      }
    }
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDeleteCharacterId(null);
  };

  // 过滤角色列表
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
    || role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div className="drawer lg:drawer-open">
      {/* 移动端悬浮按钮 */}
      <div className="lg:hidden fixed p-2 z-1">
        <label
          htmlFor="character-drawer"
          className="btn btn-circle bg-base-200 hover:bg-base-300 shadow-sm border border-base-300/50 transition-all duration-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="w-6 h-6 stroke-current"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </label>
      </div>

      <input id="character-drawer" type="checkbox" className="drawer-toggle" />
      {/* 侧边栏 */}
      <div className="drawer-side z-10">
        <label htmlFor="character-drawer" className="drawer-overlay"></label>
        <div className="menu p-4 w-80 h-full bg-base-200 flex flex-col">
          {/* 搜索和创建区域 - 固定在顶部 */}
          <div className="flex gap-2 mb-4 sticky top-0 bg-base-200 z-10 py-2">
            <input
              type="text"
              placeholder="搜索角色..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-square"
              onClick={handleCreate}
              title="创建新角色"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor" // 使用当前文字颜色
                strokeWidth="3" // 线条粗细
                strokeLinecap="round" // 线条端点样式
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* 角色列表 */}
          <div className="space-y-2 overflow-y-auto flex-1 h-0 pb-16">
            {isLoading
              ? (
                  <div className="flex justify-center items-center h-full">
                    <span className="loading loading-spinner loading-lg"></span>
                  </div>
                )
              : (
                  filteredRoles.map(role => (
                    <RoleListItem
                      key={role.id}
                      role={role}
                      isSelected={selectedRoleId === role.id}
                      onSelect={() => {
                        setSelectedRoleId(role.id);
                        setIsEditing(false);
                        const drawerCheckbox = document.getElementById("character-drawer") as HTMLInputElement;
                        if (drawerCheckbox)
                          drawerCheckbox.checked = false;
                      }}
                      onDelete={() => handleDelete(role.id)}
                    />
                  ))
                )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="drawer-content bg-base-100">

        {/* 添加条件渲染，在小屏幕且抽屉打开时隐藏内容 */}
        <div className="p-4 overflow-y-auto h-[calc(100vh-2rem)] scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100">
          {currentRole
            ? (
                <CharacterDetail
                  role={currentRole}
                  isEditing={isEditing}
                  onEdit={() => setIsEditing(true)}
                  onSave={handleSave}
                />
              )
            : (
                <EmptyState />
              )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      <PopWindow isOpen={deleteConfirmOpen} onClose={handleCancelDelete}>
        <div className="card flex flex-col w-full max-w-md">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-2xl font-bold">确认删除角色</h2>
            <div className="divider"></div>
            <p className="text-lg opacity-75 mb-8">确定要删除这个角色吗？</p>
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
    </div>
  );
}

// 子组件：角色列表项
function RoleListItem({ role, isSelected, onSelect, onDelete }: {
  role: Role;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group max-h-20 max-w-[18rem] ${isSelected ? "bg-base-100" : "hover:bg-base-100"
      }`}
      onClick={onSelect}
    >
      <div className="avatar shrink-0">
        <div className="w-12 h-12 rounded-full">
          {role.avatar
            ? (
                <img src={role.avatar} alt={role.name} />
              )
            : (
                <img src="/favicon.ico" alt="default avatar" />
              )}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <h3 className="font-medium truncate">{role.name || "新角色"}</h3>
        <p className="text-xs text-base-content/70 mt-1">
          {(role.description || "暂无描述").length > 25
            ? `${(role.description || "暂无描述").slice(0, 25)}...`
            : role.description || "暂无描述"}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-xs md:opacity-0 md:group-hover:opacity-100 opacity-70 hover:bg-base-300 rounded-full p-1 hover:[&>svg]:stroke-error"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// 空状态组件
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-4rem)] text-base-content/70">
      <div className="text-2xl mb-2">🏰</div>
      <p>请选择或创建角色</p>
    </div>
  );
}
