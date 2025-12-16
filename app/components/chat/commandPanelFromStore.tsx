import CommandPanel from "@/components/chat/commandPanel";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import React from "react";

export default function CommandPanelFromStore({
  handleSelectCommand,
  ruleId,
  className,
}: {
  handleSelectCommand: (cmdName: string) => void;
  ruleId: number;
  className?: string;
}) {
  const prefix = useChatInputUiStore(state => state.plainText);

  const commandMode = React.useMemo(() => {
    if (prefix.startsWith("%")) {
      return "webgal";
    }
    if (prefix.startsWith(".") || prefix.startsWith("。")) {
      return "dice";
    }
    return "none";
  }, [prefix]);

  return (
    <CommandPanel
      prefix={prefix}
      handleSelectCommand={handleSelectCommand}
      commandMode={commandMode}
      ruleId={ruleId}
      className={className}
    />
  );
}
