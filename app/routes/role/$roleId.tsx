import type { Role } from "@/components/newCharacter/types";
import CharacterDetail from "@/components/newCharacter/CharacterDetail"; // 确保路径正确
import { useEffect } from "react";
import { useOutletContext, useParams } from "react-router";

// 定义从 Outlet Context 接收的数据类型
interface RoleContext {
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export default function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { roles, setRoles, isEditing, setIsEditing } = useOutletContext<RoleContext>();

  // 使用 parseInt 并检查结果
  const numericRoleId = roleId ? Number.parseInt(roleId, 10) : Number.NaN;

  // 每次 roleId 变化时，重置编辑状态
  useEffect(() => {
    setIsEditing(false);
  }, [numericRoleId, setIsEditing]);

  // 如果ID无效，或者找不到角色，都显示未找到
  const currentRole = !Number.isNaN(numericRoleId)
    ? roles.find(r => r.id === numericRoleId)
    : undefined;

  if (!currentRole) {
    return <div>角色未找到或正在加载...</div>;
  }

  const handleSave = (updatedRole: Role) => {
    setRoles(prev =>
      prev.map(role =>
        role.id === updatedRole.id ? updatedRole : role,
      ),
    );
    setIsEditing(false);
  };

  return (
    <CharacterDetail
      role={currentRole}
      isEditing={isEditing}
      onEdit={() => setIsEditing(true)}
      onSave={handleSave}
      // onBack 行为现在由浏览器的后退按钮或导航到 /role 实现
    />
  );
}
