import type { Role } from "./types";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useGetUserRolesQuery, useRolesInitialization } from "api/queryHooks";
import { useEffect, useState } from "react";
import { PopWindow } from "../common/popWindow";
import { useGlobalContext } from "../globalContextProvider";
import CharacterDetail from "./CharacterDetail";

export default function CharacterMain() {
  // 获取用户数据
  const userId = useGlobalContext().userId;
  const roleQuery = useGetUserRolesQuery(userId ?? -1);
  const { roles, initializeRoles, setRoles } = useRolesInitialization(roleQuery);

  // 状态管理
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // 初始化角色数据
  useEffect(() => {
    initializeRoles();
  }, [initializeRoles]);

  // 删除角色接口
  const { mutate: deleteRole } = useMutation({
    mutationKey: ["deleteRole"],
    mutationFn: async (roleId: number[]) => {
      const res = await tuanchat.roleController.deleteRole(roleId);
      if (res.success) {
        console.warn("角色删除成功");
        return res;
      }
      else {
        console.error("删除角色失败");
        return undefined;
      }
    },
    onSuccess: () => {
      initializeRoles();
      roleQuery.refetch();
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });

  // 删除弹窗状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteCharacterId, setDeleteCharacterId] = useState<number | null>(null);

  useEffect(() => {
    initializeRoles();
  }, [initializeRoles]);

  // 创建角色接口
  const { mutateAsync: createRole } = useMutation({
    mutationKey: ["createRole"],
    mutationFn: async () => {
      const res = await tuanchat.roleController.createRole({});
      if (res.success) {
        console.warn("角色创建成功");
        return res.data;
      }
      else {
        console.error("创建角色失败");
      }
    },
    onError: (error) => {
      console.error("Mutation failed:", error);
    },
  });

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
    };

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
      <MobileDrawerToggle />
      <input id="character-drawer" type="checkbox" className="drawer-toggle" />
      {/* 侧边栏 */}
      <div className="drawer-side z-2">
        <label htmlFor="character-drawer" className="drawer-overlay"></label>
        <div className="menu p-4 w-80 min-h-full bg-base-200">
          {/* 搜索和创建区域 */}
          <div className="flex gap-2 mb-4">
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
              <span className="text-xl">+</span>
            </button>
          </div>

          {/* 角色列表 */}
          <div className="space-y-2 overflow-y-auto">
            {filteredRoles.map(role => (
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
            ))}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="drawer-content bg-base-100">
        {/* 添加条件渲染，在小屏幕且抽屉打开时隐藏内容 */}
        <div className="p-4">
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
        <div className="p-4 bg-base-200">
          <h3 className="text-lg font-bold mb-4">确认删除角色</h3>
          <p className="mb-4">确定要删除这个角色吗？</p>
          <div className="flex justify-end">
            <button type="button" className="btn btn-sm btn-outline btn-error mr-2" onClick={handleCancelDelete}>
              取消
            </button>
            <button type="button" className="btn btn-sm bg-primary text-white hover:bg-primary-focus" onClick={handleConfirmDelete}>
              确认删除
            </button>
          </div>
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
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group ${
        isSelected ? "bg-base-100" : "hover:bg-base-100"
      }`}
      onClick={onSelect}
    >
      <div className="avatar">
        <div className="w-12 h-12 rounded-full">
          {role.avatar
            ? (
                <img src={role.avatar} alt={role.name} />
              )
            : (
                <div className="bg-neutral-content flex items-center justify-center">
                  <span className="text-neutral text-sm">无</span>
                </div>
              )}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{role.name || "新角色"}</h3>
        <p className="text-sm text-base-content/70 truncate">
          {role.description || "暂无描述"}
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ✕
      </button>
    </div>
  );
}

// 子组件：移动端抽屉开关
function MobileDrawerToggle() {
  return (
    <div className="lg:hidden p-2 bg-base-100">
      <label
        htmlFor="character-drawer"
        className="btn btn-square btn-ghost"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-6 h-6 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </label>
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
