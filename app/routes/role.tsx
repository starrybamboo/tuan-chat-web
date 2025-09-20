import type { Role } from "@/components/newCharacter/types"; // 确保路径正确
import type { Route } from "./+types/home";
import { Sidebar } from "@/components/newCharacter/Sidebar"; // 确保路径正确
import { useState } from "react";
import { Outlet, useParams } from "react-router"; // 引入 Outlet 和 useParams

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "角色创建页面" },
    { name: "description", content: "创建和管理你的角色" },
  ];
}

export default function RoleLayout() {
  const [roles, setRoles] = useState<Role[]>([]);

  // 使用 useParams hook 从 URL 中获取 roleId
  const { roleId } = useParams<{ roleId: string }>();

  // 将字符串类型的 roleId 转换为 number 或 null
  const selectedRoleId = roleId ? Number.parseInt(roleId, 10) : null;

  return (
    <div className="drawer lg:drawer-open h-full min-h-0">
      <input id="character-drawer" type="checkbox" className="drawer-toggle" />

      {/* 移动端悬浮按钮 */}
      <div className="lg:hidden fixed p-2 z-1">
        <label
          htmlFor="character-drawer"
          className="btn btn-circle bg-base-200 hover:bg-base-300 shadow-sm border border-base-300/50"
        >
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
        </label>
      </div>

      <div className="drawer-side z-50">
        <label htmlFor="character-drawer" className="drawer-overlay">
          <Sidebar
            roles={roles}
            setRoles={setRoles}
            // 将从 URL 解析出的 selectedRoleId 传递给 Sidebar
            selectedRoleId={selectedRoleId}
            // setSelectedRoleId 不再需要，导航将处理选择
            // setIsEditing 仍然需要，以便在切换时重置
            // setIsEditing={setIsEditing}
            // onEnterCreateEntry 也不再需要，由导航到 /role 完成
          />
        </label>
      </div>

      <div className="drawer-content bg-base-100 md:bg-base-200 overflow-y-auto min-h-0">
        <div className="md:p-6 max-w-7xl mx-auto min-h-0">
          {/* Outlet 是子路由的渲染位置 */}
          {/* 通过 context 将状态传递给子路由 */}
          <Outlet context={{ roles, setRoles }} />
        </div>
      </div>
    </div>
  );
}
