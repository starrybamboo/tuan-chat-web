import { diceCommands, webgalCommands } from "@/utils/commands";
import React from "react";

export default function CommandPanel({ prefix, handleSelectCommand }: {
  prefix: string;
  handleSelectCommand: (cmdName: string) => void;
  commandType?: "dice" | "webgal";
}) {
  const commands = prefix.startsWith("%") ? webgalCommands : diceCommands;
  const suggestionNumber = 10;
  const isCommandMode = prefix.startsWith(".") || prefix.startsWith("。") || prefix.startsWith("%");
  const suggestions = isCommandMode
    ? commands.filter(command => command.name.startsWith(prefix.slice(1)))
        .sort((a, b) => b.importance - a.importance)
        .reverse()
        .slice(0, suggestionNumber)
    : [];
  return (
    <div className="absolute bottom-full w-[80%] mb-2 bg-base-200 rounded-box shadow-md overflow-hidden">
      {suggestions.map(cmd => (
        <div
          key={cmd.name}
          onClick={() => handleSelectCommand(cmd.name)}
          className="p-2 w-full last:border-0 hover:bg-base-300 transform origin-left hover:scale-110"
        >
          <span className="font-mono text-blue-600 dark:text-blue-400">
            {cmd.name}
          </span>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{cmd.description}</span>
        </div>
      ))}
    </div>
  );
}
