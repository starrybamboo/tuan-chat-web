import type { Role } from "@/components/newCharacter/types";
import type { RoleModuleItem } from "./context/types";
import { useQuery } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useRef, useState } from "react";
import { useModuleContext } from "./context/_moduleContext";
import { ModuleItemEnum } from "./context/types";
import NPCEdit from "./NPCEdit";

function RoleModuleTabItem({
  roleModuleItem,
  isSelected,
  onTabClick,
}: {
  roleModuleItem: RoleModuleItem;
  isSelected: boolean;
  onTabClick: (id: string) => void;
}) {
  const { id, label } = roleModuleItem;
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当组件是最新的时候，自动选中
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.checked = true;
    }
  }, [isSelected]);

  const { isPending } = useQuery({
    queryKey: ["role", roleModuleItem.id],
    queryFn: async () => {
      const res = await tuanchat.roleController.getRole(Number(id));
      const avatar = await tuanchat.avatarController.getRoleAvatar(
        res.data?.avatarId || 0,
      );
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
    enabled: !!roleModuleItem.id,
  });

  return (
    <>
      <input
        ref={inputRef}
        type="radio"
        name="WorkSpaceTab"
        className="tab"
        aria-label={label}
        onClick={onTabClick.bind(null, id)}
      />
      <div className="tab-content bg-base-100 border-base-300 p-6">
        {isPending
          ? <div>Loading</div>
          : <NPCEdit selectRole={selectedRole!} />}
      </div>
    </>
  );
}

export default function EditModule() {
  const { moduleTabItems, currentSelectedTabId, setCurrentSelectedTabId }
    = useModuleContext();
  const roleModuleItems = moduleTabItems.filter(item =>
    item.type === ModuleItemEnum.ROLE,
  );

  return (
    <div className="h-screen p-4 overflow-y-scroll">
      <div className="w-full h-full tabs tabs-lift">
        {roleModuleItems.map(item => (
          <RoleModuleTabItem
            key={item.id}
            roleModuleItem={item}
            isSelected={item.id === currentSelectedTabId}
            onTabClick={setCurrentSelectedTabId}
          />
        ))}
      </div>
    </div>
  );
}
