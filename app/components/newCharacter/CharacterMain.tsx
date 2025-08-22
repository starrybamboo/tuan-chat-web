import type { Role } from "./types";
import { useState } from "react";
import CharacterDetail from "./CharacterDetail";
// import { RoleCard } from "./RoleCard";
import { Sidebar } from "./Sidebar";

export default function CharacterMain() {
  const [roles, setRoles] = useState<Role[]>([]);
  // const [isLoading, setIsLoading] = useState(false);
  // const { roles, initializeRoles, setRoles, isLoading } = useRolesInitialization(roleQuery);

  // 状态管理
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const currentRole = roles.find(r => r.id === selectedRoleId);

  // useEffect(() => {
  //   const drawerCheckbox = document.getElementById("character-drawer") as HTMLInputElement;
  //   if (drawerCheckbox) {
  //     drawerCheckbox.checked = selectedRoleId !== null; // 有角色 ID 时打开，否则关闭
  //   }
  // }, [selectedRoleId]);
  // 保存角色

  const handleSave = (updatedRole: Role) => {
    let IsChangeAvatar = false;
    if (currentRole && updatedRole.avatarId !== currentRole.avatarId) {
      IsChangeAvatar = true;
    }
    setRoles(prev =>
      prev.map(role =>
        role.id === updatedRole.id ? updatedRole : role,
      ),
    );
    if (!IsChangeAvatar) {
      setIsEditing(false);
    }
    setSelectedRoleId(updatedRole.id);
  };

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

      {/* 使用抽象出的 Sidebar 组件 */}
      <div className="drawer-side z-50">
        <label htmlFor="character-drawer" className="drawer-overlay">
          <Sidebar
            roles={roles}
            setRoles={setRoles}
            selectedRoleId={selectedRoleId}
            setSelectedRoleId={setSelectedRoleId}
            setIsEditing={setIsEditing}
          />
        </label>
      </div>

      {/* 主内容区 */}
      <div className="drawer-content bg-base-200">
        {/* 添加条件渲染，在小屏幕且抽屉打开时隐藏内容 */}
        <div className="md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 max-w-7xl mx-auto">
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
