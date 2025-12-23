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
 * @param onDismiss 关闭面板的回调函数
 */

export default function CommandPanel({ prefix, handleSelectCommand, commandMode, suggestionNumber = 10, ruleId = 1, className, onDismiss }: {
  prefix: string;
  handleSelectCommand: (cmdName: string) => void;
  commandMode?: commandModeType;
  suggestionNumber?: number;
  ruleId?: number;
  className?: string;
  onDismiss?: () => void;
}) {
  // ESC 键关闭面板
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onDismiss) {
        onDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onDismiss]);

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
    // 提取空格前的命令部分
    const cmdPart = prefix.slice(1, prefix.indexOf(" ")).toLowerCase();
    const suggestions = Array.from(commands.entries())
      .filter(([command, info]) => {
        const commandLower = command.toLowerCase();
        // 完全匹配主命令或别名
        return commandLower === cmdPart
          || info.alias.some(alias => alias.toLowerCase() === cmdPart);
      })
      .sort((a, b) => b[0].length - a[0].length)
      .slice(0, 1)
      .map(([cmd]) => cmd);
    return (
      <div className={className}>
        {onDismiss && (
          <div className="flex justify-between items-center px-3 py-2 border-b border-base-300">
            <span className="text-xs opacity-60">指令详情 (ESC 关闭)</span>
            <button
              type="button"
              onClick={onDismiss}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label="关闭提示"
            >
              ✕
            </button>
          </div>
        )}
        {suggestions.map(cmd => (
          <div
            key={cmd}
            className="p-2 w-full last:border-0 hover:bg-base-300"
          >
            <div className="transform origin-left">
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {commands.get(cmd)?.name}
              </span>
              {(() => {
                const info = commands.get(cmd)!;
                const displayAliases = (info?.alias || []);
                return displayAliases.length > 0
                  ? (
                      <span className="ml-2 text-xs opacity-60">
                        (别名:
                        {" "}
                        {displayAliases.join(", ")}
                        )
                      </span>
                    )
                  : null;
              })()}
              <span className="ml-2 text-sm">{commands.get(cmd)?.description}</span>
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
                {commands.get(cmd)?.examples.map(example => (
                  <div key={`example-${example}`}>
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
  const hasSpace = prefix.includes(" ");
  // 有空格时，只取空格前的命令部分；无空格时，取整个输入（去掉前缀符号）
  const searchTerm = hasSpace
    ? prefix.slice(1, prefix.indexOf(" ")).toLowerCase()
    : prefix.slice(1).toLowerCase();

  const allMatches = Array.from(commands.entries())
    .map(([name, info]) => {
      const nameLower = name.toLowerCase();

      // 计算匹配分数
      let score = 0;
      let matched = false;
      let isExactMatch = false; // 标记是否为完全匹配

      // 主命令名匹配
      if (nameLower === searchTerm) {
        score = 10000; // 完全匹配最高优先级
        matched = true;
        isExactMatch = true;
      }
      else if (nameLower.startsWith(searchTerm)) {
        // 前缀匹配：公共前缀越长越相似，长度差越小越好
        const lengthDiff = Math.abs(name.length - searchTerm.length);
        score = 5000 - lengthDiff * 10;
        matched = true;
      }

      // 别名匹配
      if (!matched && info.alias.length > 0) {
        for (const alias of info.alias) {
          const aliasLower = alias.toLowerCase();
          if (aliasLower === searchTerm) {
            score = 8000; // 别名完全匹配（低于主命令完全匹配）
            matched = true;
            isExactMatch = true;
            break;
          }
          else if (aliasLower.startsWith(searchTerm)) {
            // 别名前缀匹配：同样按相似度排序
            const lengthDiff = Math.abs(alias.length - searchTerm.length);
            score = 3000 - lengthDiff * 10;
            matched = true;
            break;
          }
        }
      }

      if (!matched)
        return null;

      // 主命令加分（name 不在 alias 中）
      if (!info.alias.includes(name)) {
        score += 50;
      }

      return { name, info, score, isExactMatch };
    })
    .filter((item): item is { name: string; info: CommandInfo; score: number; isExactMatch: boolean } => item !== null);

  // 空格前：显示所有匹配；空格后：只显示完全匹配
  const hasExactMatch = allMatches.some(item => item.isExactMatch);
  const filteredMatches = (hasSpace && hasExactMatch)
    ? allMatches.filter(item => item.isExactMatch)
    : allMatches;

  const suggestions = filteredMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, suggestionNumber)
    .map(item => item.name);
  return (
    <div className={className}>
      {onDismiss && (
        <div className="flex justify-between items-center px-3 py-2 border-b border-base-300">
          <span className="text-xs opacity-60">指令提示 (ESC 关闭)</span>
          <button
            type="button"
            onClick={onDismiss}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="关闭提示"
          >
            ✕
          </button>
        </div>
      )}
      {suggestions.map(cmd => (
        <div
          key={cmd}
          onClick={() => handleSelectCommand(cmd)}
          className="p-2 w-full last:border-0 hover:bg-base-300 cursor-pointer"
        >
          <div className="transform origin-left">
            <span className="font-mono text-blue-600 dark:text-blue-400">
              {cmd}
            </span>
            {commands.get(cmd)?.alias && commands.get(cmd)!.alias.length > 0 && (
              <span className="ml-2 text-xs opacity-60">
                (别名:
                {" "}
                {commands.get(cmd)!.alias.join(", ")}
                )
              </span>
            )}
            <span className="ml-2 text-sm">{commands.get(cmd)?.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
