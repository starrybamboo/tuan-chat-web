import type { ChatMessageResponse } from "@tuanchat/openapi-client/models/ChatMessageResponse";
import type { Message } from "@tuanchat/openapi-client/models/Message";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";

import { BottomSheetModal } from "@/components/BottomSheetModal";
import { useTheme } from "@/hooks/use-theme";

import { MapPanel } from "./MapPanel";

type MapSheetProps = {
  currentRoleId: number | null;
  isKP: boolean;
  messageResponses?: ChatMessageResponse[];
  messages: Message[];
  onClose: () => void;
  roomId: number | null;
  roomRoles: UserRole[];
  ruleId: number | null | undefined;
  visible: boolean;
};

export function MapSheet({
  currentRoleId,
  isKP,
  messageResponses,
  messages,
  onClose,
  roomId,
  roomRoles,
  ruleId,
  visible,
}: MapSheetProps) {
  const theme = useTheme();

  return (
    <BottomSheetModal
      backgroundColor={theme.surface}
      handleColor={theme.border}
      maxHeight="82%"
      onClose={onClose}
      visible={visible}
    >
      <MapPanel
        currentRoleId={currentRoleId}
        isKP={isKP}
        messageResponses={messageResponses}
        messages={messages}
        roomId={roomId}
        roomRoles={roomRoles}
        ruleId={ruleId}
      />
    </BottomSheetModal>
  );
}
