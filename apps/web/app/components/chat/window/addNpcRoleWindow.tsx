import { use, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { structuralListItemMotionProps } from "@/components/common/motion/listItemMotion";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { AddRingLight } from "@/icons";

import { useGetRoomNpcRoleQuery } from "../../../../api/hooks/chatQueryHooks";
import { useGetSpaceRepositoryRoleQuery } from "../../../../api/hooks/spaceRepositoryHooks";
import CreateNpcRoleWindow from "./createNpcRoleWindow";

const NPC_ROLE_CARD_CLASS_NAME = surfaceClassName({
  level: "content",
  className: "cursor-pointer shadow transition-shadow hover:shadow-lg motion-reduce:transition-none",
});

export function AddNpcRoleWindow({
  handleAddRole,
}: {
  handleAddRole: (roleId: number) => void;
}) {
  const roomContext = use(RoomContext);
  const roomId = roomContext.roomId ?? -1;

  const spaceContext = use(SpaceContext);
  const spaceId = spaceContext.spaceId ?? -1;

  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(roomId);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const spaceRolesQuery = useGetSpaceRepositoryRoleQuery(spaceId);
  const spaceRoles = useMemo(() => spaceRolesQuery.data?.data ?? [], [spaceRolesQuery.data?.data]);

  const roleIdInRoomSet = useMemo(() => {
    return new Set<number>(roomNpcRoles.map(r => r.roleId));
  }, [roomNpcRoles]);

  const availableSpaceRoles = useMemo(() => {
    return spaceRoles.filter(r => r.type === 2 && !roleIdInRoomSet.has(r.roleId));
  }, [roleIdInRoomSet, spaceRoles]);

  const [isCreatingNpc, setIsCreatingNpc] = useState(false);

  if (isCreatingNpc) {
    return <CreateNpcRoleWindow onClose={() => setIsCreatingNpc(false)} />;
  }

  return (
    <div className="justify-center w-full">
      <p className="text-lg font-bold text-center w-full mb-4">
        导入NPC
      </p>

      <div className="bg-base-100 rounded-md p-6">
        {availableSpaceRoles.length === 0 && (
          <div className="text-center font-bold py-5">暂无NPC可导入</div>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <AnimatePresence initial={false} mode="popLayout">
            {availableSpaceRoles.map((role, index) => (
              <motion.div
                className={NPC_ROLE_CARD_CLASS_NAME}
                key={role.roleId}
                {...structuralListItemMotionProps({
                  index,
                  staggerDelay: 0.01,
                  maxDelay: 0.08,
                })}
              >
              <button
                type="button"
                className="flex flex-col items-center p-3"
                aria-label={`添加 NPC ${role.roleName}`}
                title={role.roleName}
                onClick={() => handleAddRole(role.roleId)}
              >
                <RoleAvatarByRole
                  role={role}
                  width={24}
                  isRounded={true}
                  withTitle={false}
                  stopToastWindow={true}
                />
                <span className="text-center block">{role.roleName}</span>
              </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button
            type="button"
            className={NPC_ROLE_CARD_CLASS_NAME}
            onClick={() => setIsCreatingNpc(true)}
          >
            <div className="flex flex-col items-center p-3">
              <AddRingLight className="size-24 jump_icon" />
              <p className="text-center block">创建NPC</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
