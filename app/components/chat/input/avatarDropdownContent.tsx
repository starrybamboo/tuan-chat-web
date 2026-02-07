import React from "react";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";

interface AvatarDropdownContentProps {
  roleId: number;
  onAvatarChange: (avatarId: number) => void;
  onRoleChange: (roleId: number) => void;
  onRequestClose?: () => void;
}

function AvatarDropdownContentImpl({
  roleId,
  onAvatarChange,
  onRoleChange,
  onRequestClose,
}: AvatarDropdownContentProps) {
  return (
    <div className="p-2">
      <ExpressionChooser
        roleId={roleId}
        handleExpressionChange={onAvatarChange}
        handleRoleChange={onRoleChange}
        onRequestClose={onRequestClose}
      />
    </div>
  );
}

const AvatarDropdownContent = React.memo(AvatarDropdownContentImpl);
export default AvatarDropdownContent;
