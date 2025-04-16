import type { Role } from "./types";
// CharacterMain.tsx（原CharacterNav）
import { useState } from "react";
import CharacterDetail from "./CharacterDetail";

export default function CharacterMain() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 创建新角色
  const handleCreate = () => {
    const newRole: Role = {
      id: Date.now(),
      name: "",
      description: "",
      avatar: "",
      inventory: [],
      abilities: [],
    };
    setRoles(prev => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setIsEditing(true);
  };

  // 删除角色
  const handleDelete = (roleId: number) => {
    setRoles(prev => prev.filter(role => role.id !== roleId));
    if (selectedRoleId === roleId)
      setSelectedRoleId(null);
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

  // 过滤角色列表
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
    || role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const currentRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div className="drawer lg:drawer-open">
      <input id="character-drawer" type="checkbox" className="drawer-toggle" />

      {/* 侧边栏 */}
      <div className="drawer-side">
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
                }}
                onDelete={() => handleDelete(role.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="drawer-content">
        <MobileDrawerToggle />

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
    <div className="lg:hidden p-2">
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

// 子组件：空状态
function EmptyState() {
  return (
    <div className="text-center p-8 text-base-content/70">
      <div className="text-2xl mb-2">🏰</div>
      <p>请选择或创建角色</p>
    </div>
  );
}
