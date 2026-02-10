import React from "react";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";

interface AvatarDropdownContentProps {
  roleId: number;
  onAvatarChange: (avatarId: number) => void;
  onRoleChange: (roleId: number) => void;
  onRequestClose?: () => void;
  defaultFullscreen?: boolean;
  onRequestFullscreen?: (next: boolean) => void;
}

function AvatarDropdownContentImpl({
  roleId,
  onAvatarChange,
  onRoleChange,
  onRequestClose,
  defaultFullscreen,
  onRequestFullscreen,
}: AvatarDropdownContentProps) {
  return (
    <div className="p-2">
      <ExpressionChooser
        roleId={roleId}
        handleExpressionChange={onAvatarChange}
        handleRoleChange={onRoleChange}
        onRequestClose={onRequestClose}
        defaultFullscreen={defaultFullscreen}
        onRequestFullscreen={onRequestFullscreen}
      />
    </div>
  );
}

const AvatarDropdownContent = React.memo(AvatarDropdownContentImpl);
export default AvatarDropdownContent;
