import type { Role } from "./types";
import { useState } from "react";
import AICreateRole from "./AICreateRole";
import CharacterDetail from "./CharacterDetail";
import ExcelImportRole from "./ExcelImportRole";
import { Sidebar } from "./Sidebar";

export default function CharacterMain() {
  const [roles, setRoles] = useState<Role[]>([]);

  // 状态管理
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mode, setMode] = useState<"self" | "AI" | "excel">("self");
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
      <div className="drawer-content bg-base-200">
        {/* 添加条件渲染，在小屏幕且抽屉打开时隐藏内容 */}
        <div className="md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-base-100 max-w-7xl mx-auto">
          {mode === "self" && !currentRole && <EmptyState AICreate={AICreate} ExcelImport={ExcelImport} createBySelf={createBySelf} />}
          {mode === "self" && currentRole && (
            <CharacterDetail
              role={currentRole}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onSave={handleSave}
            />
          )}
          {mode === "AI" && <AICreateRole />}
          {mode === "excel" && <ExcelImportRole />}
        </div>
      </div>
    </div>
  );
};

// 空状态组件
function EmptyState({ AICreate, ExcelImport, createBySelf }: { AICreate: () => void; ExcelImport: () => void; createBySelf: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-4rem)] p-6">
      <h2 className="text-2xl font-bold text-base-content mb-2">创建新角色</h2>
      <p className="text-sm text-base-content/70 mb-8">选择一种方式开始创建你的角色</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* AI卡 */}
        <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-md transition-shadow duration-200 cursor-pointer h-100" onClick={AICreate}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-base-content mb-2 text-center">AI卡</h3>
          <p className="text-sm text-base-content/70 text-center leading-relaxed">
            使用AI智能生成角色属性和背景故事，快速创建丰富的角色设定
          </p>
        </div>

        {/* 从Excel导入 */}
        <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={ExcelImport}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-base-content mb-2 text-center">从Excel导入</h3>
          <p className="text-sm text-base-content/70 text-center leading-relaxed">
            导入现有的Excel角色数据表，批量创建或更新角色信息
          </p>
        </div>

        {/* 从0开始创建 */}
        <div className="bg-base-100 rounded-xl p-6 shadow-sm border border-base-200 hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={createBySelf}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-base-content mb-2 text-center">从0开始创建</h3>
          <p className="text-sm text-base-content/70 text-center leading-relaxed">
            手动填写所有角色信息，完全自定义角色的每一个细节
          </p>
        </div>
      </div>

      <p className="mt-10 text-xs text-base-content/70 text-center">
        选择最适合你的创建方式，开始构建独特的角色世界
      </p>
    </div>
  );
}
