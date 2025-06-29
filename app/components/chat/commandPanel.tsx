import { diceCommands, webgalCommands } from "@/utils/commands";
import React from "react";

/**
 * 定义命令面板支持的命令模式类型
 * - 'dice': 骰子命令模式
 * - 'webgal': WebGal命令模式
 * - 'none': 无命令模式
 */
export type commandModeType = "dice" | "webgal" | "none";
/**
 * 命令面板组件，用于显示和选择命令建议
 * @param prefix 当前输入的命令前缀（包含触发字符如/或.）
 * @param handleSelectCommand 选择命令时的回调函数
 * @param commandMode 当前命令模式，决定显示哪类命令
 * @param suggestionNumber 显示的建议命令数量，默认为10
 */

export default function CommandPanel({ prefix, handleSelectCommand, commandMode, suggestionNumber = 10, className }: {
  prefix: string;
  handleSelectCommand: (cmdName: string) => void;
  commandMode?: commandModeType;
  suggestionNumber?: number;
  className?: string;
}) {
  const commands = (() => {
    switch (commandMode) {
      case "dice":
        return diceCommands;
      case "webgal":
        return webgalCommands;
      case "none":
      default:
        return [];
    }
  })();
  const suggestions = commands
    .filter(command => command.name.startsWith(prefix.slice(1)))
    .sort((a, b) => b.importance - a.importance)
    .reverse()
    .slice(0, suggestionNumber);
  return (
    <div className={className}>
      {suggestions.map(cmd => (
        <div
          key={cmd.name}
          onClick={() => handleSelectCommand(cmd.name)}
          className="p-2 w-full last:border-0 hover:bg-base-300"
        >
          <div className="transform origin-left">
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {cmd.name}
            </span>
            <span className="ml-2 text-sm">{cmd.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
