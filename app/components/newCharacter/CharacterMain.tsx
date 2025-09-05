import type { Role } from "./types";
import { useEffect, useState } from "react";
import CharacterDetail from "./CharacterDetail";
import AICreateRole from "./RoleCreation/AICreateRole";
import CreateEntry from "./RoleCreation/CreateEntry";
import CreateRoleBySelf from "./RoleCreation/CreateRoleBySelf";
import ExcelImportRole from "./RoleCreation/ExcelImportRole";
import { Sidebar } from "./Sidebar";

export default function CharacterMain() {
  const [roles, setRoles] = useState<Role[]>([]);

  // 状态管理
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"self" | "AI" | "excel" | "role">("role");
  const currentRole = roles.find(r => r.id === selectedRoleId);

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

  // 空状态的创建
  const AICreate = () => {
    setMode("AI");
  };
  const ExcelImport = () => {
    setMode("excel");
  };

  const createBySelf = () => {
    setMode("self");
  };

  // 切换角色时，将模式设置回self
  useEffect(() => {
    if (selectedRoleId !== null) {
      setMode("role");
    }
  }, [selectedRoleId]);

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
            onSave={handleSave}
          />
        </label>
      </div>

      {/* 主内容区 */}
      <div className="drawer-content bg-base-100 md:bg-base-200">
        {/* 添加条件渲染，在小屏幕且抽屉打开时隐藏内容 */}
        <div className="md:p-6 max-w-7xl mx-auto">
          {mode === "role" && !currentRole && <CreateEntry AICreate={AICreate} ExcelImport={ExcelImport} createBySelf={createBySelf} />}
          {mode === "role" && currentRole && (
            <CharacterDetail
              role={currentRole}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
              onBack={() => {
                setSelectedRoleId(null);
                setIsEditing(false);
              }}
            />
          )}
          {mode === "self" && <CreateRoleBySelf onBack={() => setMode("role")} />}
          {mode === "AI" && (
            <AICreateRole
              setRoles={setRoles}
              setSelectedRoleId={setSelectedRoleId}
              onSave={handleSave}
              onBack={() => setMode("role")} // 返回到CreateEntry页面
              onComplete={() => setMode("role")} // 完成后切换回角色模式
            />
          )}
          {mode === "excel" && <ExcelImportRole onBack={() => setMode("role")} />}
        </div>
      </div>
    </div>
  );
};
