import { getCommandList } from "@/components/common/dicer/cmdPre";
import { webgalCommands } from "@/components/common/dicer/commands";
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
 * @param ruleId 规则ID，用于获取特定规则下的命令列表，默认为1
 * @param className 组件的自定义类名
 */

export default function CommandPanel({ prefix, handleSelectCommand, commandMode, suggestionNumber = 10, ruleId = 1, className }: {
  prefix: string;
  handleSelectCommand: (cmdName: string) => void;
  commandMode?: commandModeType;
  suggestionNumber?: number;
  ruleId?: number;
  className?: string;
}) {
  const commands = (() => {
    switch (commandMode) {
      case "dice":
        return getCommandList(ruleId);
      case "webgal":
        return webgalCommands;
      case "none":
      default:
        return new Map<string, CommandInfo>();
    }
  })();
  if (prefix.includes(" ")) {
    const suggestions = Array.from(commands.keys())
      .filter(command => prefix.slice(1).startsWith(command))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .slice(0, suggestionNumber);
    return (
      <div className={className}>
        {suggestions.map(cmd => (
          <div
            key={cmd}
            className="p-2 w-full last:border-0 hover:bg-base-300"
          >
            <div className="transform origin-left">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {commands.get(cmd)?.name}
              </span>
              <span className="ml-2 text-sm">{commands.get(cmd)?.description}</span>
            </div>
            <div className="transform origin-left">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                别名：
              </span>
              <span className="ml-2 text-sm">
                {commands.get(cmd)?.alias.join(", ")}
              </span>
            </div>
            <div className="transform origin-left">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                用法：
              </span>
              <span className="ml-2 text-sm">
                {commands.get(cmd)?.usage || "无用法说明"}
              </span>
              <div className="transform origin-left">
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  示例：
                </span>
                {commands.get(cmd)?.examples.map((example, index) => (
                  <div key={`example-${index}`}>
                    <span className="ml-2 text-sm"><code>{example}</code></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  const suggestions = Array.from(commands.keys())
    .filter(command => command.startsWith(prefix.slice(1)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .slice(0, suggestionNumber);
  return (
    <div className={className}>
      {suggestions.map(cmd => (
        <div
          key={cmd}
          onClick={() => handleSelectCommand(cmd)}
          className="p-2 w-full last:border-0 hover:bg-base-300"
        >
          <div className="transform origin-left">
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {cmd}
            </span>
            <span className="ml-2 text-sm">{commands.get(cmd)?.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
