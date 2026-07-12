import { use, useMemo } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { CharacterData } from "@/components/Role/RoleCreation/types";
import type { Role } from "@/components/Role/types";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import RoleCreationFlow from "@/components/Role/RoleCreation/RoleCreationFlow";

import { useAddRoomRoleMutation } from "../../../../api/hooks/chatQueryHooks";

export default function CreateRoleWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  const ruleId = spaceContext.ruleId ?? 0;

  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const addRoomRoleMutation = useAddRoomRoleMutation();

  const initialCharacterData = useMemo<CharacterData>(() => {
    return {
      name: "",
      description: "",
      avatar: "",
      ruleId: ruleId > 0 ? ruleId : 0,
      act: {},
      basic: {},
      ability: {},
      skill: {},
    };
  }, [ruleId]);

  const handleCreateRoleComplete = (createdRole: Role) => {
    void (async () => {
      if (roomId <= 0) {
        appToast.error("房间信息异常，无法创建角色");
        return;
      }
      try {
        await addRoomRoleMutation.mutateAsync({
          roomId,
          roleIdList: [createdRole.id],
        });
        appToast.success("角色创建成功");
        onClose();
      }
      catch (e: any) {
        console.error("添加角色到房间失败", e);
        appToast.error(e?.message ? `添加角色到房间失败：${e.message}` : "添加角色到房间失败");
      }
    })();
  };

  return (
    <div className="justify-center w-full">
      <div className="
        bg-base-100 rounded-md p-2
        sm:p-4
      ">
        <RoleCreationFlow
          title="创建角色"
          description="填写角色信息，完成创建并加入当前房间"
          onBack={onClose}
          onComplete={handleCreateRoleComplete}
          roleCreateDefaults={{ type: 0 }}
          initialCharacterData={initialCharacterData}
          hideRuleSelection={ruleId > 0}
        />
      </div>
    </div>
  );
}
