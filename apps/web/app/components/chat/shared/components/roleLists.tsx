import type { DragEvent } from "react";

import { AnimatePresence, motion } from "motion/react";

import { setRoleRefDragData } from "@/components/chat/utils/roleRef";
import { structuralListItemMotionProps } from "@/components/common/motion/listItemMotion";
import { RoleAvatarByRole } from "@/components/common/roleAccess";
import { RoleTypeBadge } from "@/components/common/roleTypeBadge";

import type { UserRole } from "../../../../../api";

export default function RoleList({
  roles,
  className,
  isNpcRole = false,
  allowKickOut,
  kickOutByManagerOnly = false,
  sourceRoomId,
}: {
  roles: UserRole[];
  className?: string;
  isNpcRole?: boolean;
  allowKickOut?: boolean;
  kickOutByManagerOnly?: boolean;
  sourceRoomId?: number;
}) {
  const resolvedAllowKickOut = typeof allowKickOut === "boolean" ? allowKickOut : !isNpcRole;

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {roles.map(role => (
          <motion.div
            key={role.roleId}
            className={`
              flex gap-3 p-3 bg-base-200 rounded-lg items-center
              ${className}
            `}
            draggable={role.roleId > 0}
            onDragStartCapture={(event: DragEvent<HTMLDivElement>) => {
              if (role.roleId <= 0) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.effectAllowed = "copy";
              setRoleRefDragData(event.dataTransfer, {
                roleId: role.roleId,
                ...(sourceRoomId && sourceRoomId > 0 ? { roomId: sourceRoomId } : {}),
                ...(role.roleName ? { roleName: role.roleName } : {}),
              });
            }}
            {...structuralListItemMotionProps()}
          >
            <div className="flex flex-row gap-3 items-center">
              <RoleAvatarByRole
                role={role}
                width={10}
                isRounded={true}
                withTitle={false}
                allowKickOut={resolvedAllowKickOut}
                kickOutByManagerOnly={kickOutByManagerOnly}
              />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="truncate">{role.roleName}</span>
              <RoleTypeBadge role={role} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
