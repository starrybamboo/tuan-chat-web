import CommandPanel from "@/components/chat/input/commandPanel";
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
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [lastCommandPrefix, setLastCommandPrefix] = React.useState("");

  // 判断是否是有效的指令前缀（排除纯标点）
  const isValidCommand = React.useCallback((text: string) => {
    if (!text.startsWith(".") && !text.startsWith("。") && !text.startsWith("%")) {
      return false;
    }

    // 如果前缀后只有标点符号（无字母数字中文），不视为指令
    const afterPrefix = text.slice(1);
    if (afterPrefix && !/[a-z0-9\u4E00-\u9FA5]/i.test(afterPrefix)) {
      return false; // 如 "。。。" 或 "..."
    }

    return true;
  }, []);

  const commandMode = React.useMemo(() => {
    if (!isValidCommand(prefix)) {
      return "none";
    }
    if (prefix.startsWith("%")) {
      return "webgal";
    }
    if (prefix.startsWith(".") || prefix.startsWith("。")) {
      return "dice";
    }
    return "none";
  }, [prefix, isValidCommand]);

  // 当输入从非指令变为指令时，重置关闭状态
  React.useEffect(() => {
    const isCommand = isValidCommand(prefix);
    const wasCommand = isValidCommand(lastCommandPrefix);

    if (isCommand && !wasCommand) {
      setIsDismissed(false);
    }
    setLastCommandPrefix(prefix);
  }, [prefix, lastCommandPrefix, isValidCommand]);

  const handleDismiss = React.useCallback(() => {
    setIsDismissed(true);
  }, []);

  // 如果被关闭或不是有效指令，不显示面板
  if (isDismissed || !isValidCommand(prefix)) {
    return null;
  }

  return (
    <CommandPanel
      prefix={prefix}
      handleSelectCommand={handleSelectCommand}
      commandMode={commandMode}
      ruleId={ruleId}
      className={className}
      onDismiss={handleDismiss}
    />
  );
}
