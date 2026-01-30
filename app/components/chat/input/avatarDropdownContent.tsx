import React from "react";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";

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
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);

  return (
    <div className="p-2">
      <ExpressionChooser
        roleId={roleId}
        handleExpressionChange={onAvatarChange}
        handleRoleChange={onRoleChange}
        showNarratorOption={webgalLinkMode}
      />
    </div>
  );
}

const AvatarDropdownContent = React.memo(AvatarDropdownContentImpl);
export default AvatarDropdownContent;
