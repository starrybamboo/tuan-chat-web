import React from "react";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";

interface AvatarDropdownContentProps {
  roleId: number;
  onAvatarChange: (avatarId: number) => void;
  onRoleChange: (roleId: number) => void;
}

function AvatarDropdownContentImpl({
  roleId,
  onAvatarChange,
  onRoleChange,
}: AvatarDropdownContentProps) {
  return (
    <div className="p-2">
      <ExpressionChooser
        roleId={roleId}
        handleExpressionChange={onAvatarChange}
        handleRoleChange={onRoleChange}
      />
    </div>
  );
}

const AvatarDropdownContent = React.memo(AvatarDropdownContentImpl);
export default AvatarDropdownContent;
