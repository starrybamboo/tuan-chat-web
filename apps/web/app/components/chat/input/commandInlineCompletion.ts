import type { CommandInfo } from "@tuanchat/domain/command-request";

import { getCommandCatalog } from "@tuanchat/domain/command-catalog";

export type CommandInlineCompletion = {
  commandName: string;
  completedText: string;
  previewText: string;
  suffix: string;
  description: string;
};

type CommandMatch = {
  command: CommandInfo;
  token: string;
  score: number;
  index: number;
  isExact: boolean;
};

const COMMAND_PREFIXES = new Set([".", "。"]);

function getCommandPrefix(text: string) {
  const prefix = text.charAt(0);
  return COMMAND_PREFIXES.has(prefix) ? prefix : null;
}

function normalizeExamplePrefix(example: string, prefix: string) {
  return example.replace(/^[.。/]/, prefix);
}

function getExampleForToken(command: CommandInfo, token: string, prefix: string) {
  const tokenLower = token.toLowerCase();
  return command.examples
    .map(example => normalizeExamplePrefix(example, prefix))
    .find((example) => {
      const exampleCommand = example.slice(prefix.length).split(/\s+/, 1)[0]?.toLowerCase() ?? "";
      return example.startsWith(prefix) && exampleCommand === tokenLower;
    });
}

function rankCommandMatch(command: CommandInfo, query: string, index: number): CommandMatch | null {
  const queryLower = query.toLowerCase();
  const tokens = [command.name, ...command.alias];
  let best: CommandMatch | null = null;

  for (const token of tokens) {
    const tokenLower = token.toLowerCase();
    let score = token === command.name ? 100 : 0;
    let isExact = false;

    if (queryLower === "") {
      score += 1000 - index;
    }
    else if (tokenLower === queryLower) {
      score += token === command.name ? 10000 : 9000;
      isExact = true;
    }
    else if (tokenLower.startsWith(queryLower)) {
      score += 5000 - (token.length - query.length) * 10;
    }
    else {
      continue;
    }

    if (!best || score > best.score) {
      best = { command, token, score, index, isExact };
    }
  }

  return best;
}

function findBestCommandMatch(commands: CommandInfo[], query: string) {
  return commands
    .map((command, index) => rankCommandMatch(command, query, index))
    .filter((match): match is CommandMatch => match !== null)
    .sort((left, right) => right.score - left.score || left.index - right.index)[0] ?? null;
}

function buildCompletionFromExample(params: {
  command: CommandInfo;
  prefix: string;
  text: string;
  token: string;
}) {
  const example = getExampleForToken(params.command, params.token, params.prefix);
  if (!example || !example.toLowerCase().startsWith(params.text.toLowerCase())) {
    return null;
  }

  const suffix = example.slice(params.text.length);
  if (!suffix) {
    return null;
  }

  return {
    commandName: params.command.name,
    completedText: example,
    previewText: example,
    suffix,
    description: params.command.description,
  } satisfies CommandInlineCompletion;
}

export function resolveCommandInlineCompletion(params: {
  text: string;
  ruleId: number | null;
}): CommandInlineCompletion | null {
  const text = params.text;
  const prefix = getCommandPrefix(text);
  if (!prefix || text.includes("\n")) {
    return null;
  }

  const commandBody = text.slice(prefix.length);
  if (commandBody && !/[a-z0-9\u4E00-\u9FA5\s]/i.test(commandBody)) {
    return null;
  }

  const commands = getCommandCatalog(params.ruleId);
  const commandTokenMatch = commandBody.match(/^([^\s]*)/);
  const commandToken = commandTokenMatch?.[1] ?? "";
  const commandMatch = findBestCommandMatch(commands, commandToken);
  if (!commandMatch) {
    return null;
  }

  if (/\s/.test(commandBody)) {
    return buildCompletionFromExample({
      command: commandMatch.command,
      prefix,
      text,
      token: commandToken,
    });
  }

  if (commandMatch.isExact) {
    const exactExampleCompletion = buildCompletionFromExample({
      command: commandMatch.command,
      prefix,
      text,
      token: commandMatch.token,
    });
    if (exactExampleCompletion) {
      return exactExampleCompletion;
    }
  }

  const completedText = `${prefix}${commandMatch.token} `;
  const suffix = completedText.slice(text.length);
  if (!suffix) {
    return null;
  }

  return {
    commandName: commandMatch.command.name,
    completedText,
    previewText: completedText,
    suffix,
    description: commandMatch.command.description,
  };
}
