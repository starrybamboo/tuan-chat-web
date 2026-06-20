import React from "react";

import { ExpressionChooser } from "@/components/chat/input/expressionChooser";

type AvatarDropdownContentProps = {
  roleId: number;
  selectedAvatarId?: number;
  onAvatarChange: (avatarId: number) => void;
  onRoleChange: (roleId: number) => void;
  onRequestClose?: () => void;
  defaultFullscreen?: boolean;
  onRequestFullscreen?: (next: boolean) => void;
}

function AvatarDropdownContentImpl({
  roleId,
  selectedAvatarId,
  onAvatarChange,
  onRoleChange,
  onRequestClose,
  defaultFullscreen,
  onRequestFullscreen,
}: AvatarDropdownContentProps) {
  return (
    <div className="size-full min-h-0 min-w-0">
      <ExpressionChooser
        roleId={roleId}
        selectedAvatarId={selectedAvatarId}
        handleExpressionChange={onAvatarChange}
        handleRoleChange={onRoleChange}
        onRequestClose={onRequestClose}
        defaultFullscreen={defaultFullscreen}
        onRequestFullscreen={onRequestFullscreen}
        fitContainer={true}
      />
    </div>
  );
}

const AvatarDropdownContent = React.memo(AvatarDropdownContentImpl);
export default AvatarDropdownContent;
