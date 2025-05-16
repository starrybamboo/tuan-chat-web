import type { Role } from "@/components/newCharacter/types";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
// EditModule.tsx
import { useState } from "react";
import { moduleType, useModuleContext } from "./ModuleContext";
import NPCEdit from "./NPCEdit";

export default function EditModule() {
  const { modulePartition, selectedRoleId } = useModuleContext();

  // 编辑角色所需
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useQuery({
    queryKey: ["role", selectedRoleId],
    queryFn: async () => {
      const res = await tuanchat.roleController.getRole(selectedRoleId || 0);
      const avatar = await tuanchat.avatarController.getRoleAvatar(res.data?.avatarId || 0);
      if (res.success && avatar.success) {
        const newRole = {
          id: res.data?.roleId || 0,
          avatar: avatar.data?.avatarUrl || "",
          name: res.data?.roleName || "",
          description: res.data?.description || "",
          avatarId: res.data?.avatarId || 0,
          modelName: res.data?.modelName || "",
          speakerName: res.data?.speakerName || "",
        };
        setSelectedRole(newRole);
      }
      return null;
    },
  });

  return (
    <div className="h-screen p-4 overflow-y-scroll">
      <h2 className="text-xl font-bold mb-4">编辑区域</h2>

      {/* 判断是否是 content 下的不同子类型 */}
      {modulePartition === moduleType.content.role && (
        <div>
          <p>正在编辑：角色</p>
          {selectedRole && <NPCEdit selectRole={selectedRole} />}
        </div>
      )}

      {modulePartition === moduleType.content.item && (
        <div>
          <p>正在编辑：物品</p>
          {/* 这里可以插入物品编辑内容 */}
        </div>
      )}

      {modulePartition === moduleType.content.scene && (
        <div>
          <p>正在编辑：场景</p>
          {/* 这里可以插入场景编辑内容 */}
        </div>
      )}

      {/* 其他模块类型 */}
      {modulePartition === moduleType.staging && (
        <div>
          <p>暂存区内容</p>
        </div>
      )}

      {modulePartition === moduleType.history && (
        <div>
          <p>历史记录面板</p>
        </div>
      )}
    </div>
  );
}
