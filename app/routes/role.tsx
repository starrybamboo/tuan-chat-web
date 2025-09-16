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
  const [isEditing, setIsEditing] = useState(false);

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
          {/* SVG Icon */}
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
          <Outlet context={{ roles, setRoles, isEditing, setIsEditing }} />
        </div>
      </div>
    </div>
  );
}
