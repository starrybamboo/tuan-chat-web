import type { CommandInfo, CPI, RoleAbility, UserRole } from "./types";

export class RuleNameSpace {
  id: number;
  name: string;
  alias: string[];
  description: string;
  cmdMap: Map<string, CommandExecutor>;
  cmdRecord: Map<string, CommandExecutor>;
  aliasMap: Map<string, string>;
  dependentValueMap: Map<string, (ability: RoleAbility) => { type: string; value: string | number }>;

  constructor(
    id: number,
    name: string,
    alias: string[],
    description: string,
    aliasMap: Map<string, string> = new Map(),
    dependentValueMap: Map<string, (ability: RoleAbility) => { type: string; value: string | number }> = new Map(),
  ) {
    this.id = id;
    this.name = name;
    this.alias = alias;
    this.description = description;
    this.cmdMap = new Map();
    this.cmdRecord = new Map();
    this.aliasMap = aliasMap;
    this.dependentValueMap = dependentValueMap;
  }

  addCmd(cmd: CommandExecutor) {
    this.cmdMap.set(cmd.cmdInfo.name, cmd);
    cmd.cmdInfo.alias.forEach((alias) => {
      this.cmdMap.set(alias, cmd);
    });
    this.cmdRecord.set(cmd.cmdInfo.name, cmd);
  }

  getCmd(name: string): CommandInfo | undefined {
    return this.cmdMap.get(name)?.cmdInfo;
  }

  getCmdList(): Map<string, CommandInfo> {
    const cmdList = new Map<string, CommandInfo>();
    this.cmdRecord.forEach((executor, name) => {
      cmdList.set(name, executor.cmdInfo);
    });
    return cmdList;
  }

  execute(name: string, args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> {
    const cmd = this.cmdMap.get(name);
    if (cmd) {
      return cmd.solve(args, mentioned, cpi);
    }
    throw new Error(`${this.name}指令集中没有名为${name}的指令`);
  }

  getDependentValue(key: string, ability: RoleAbility): { type: string; value: string | number } | undefined {
    return this.dependentValueMap.get(key)?.(ability);
  }
}

export class CommandExecutor {
  cmdInfo: CommandInfo;
  solve: (args: string[], mentioned: UserRole[], cpi: CPI) => Promise<boolean>;

  constructor(
    name: string,
    alias: string[],
    description: string,
    examples: string[],
    usage: string,
    solve: (args: string[], mentioned: UserRole[], cpi: CPI) => boolean | Promise<boolean>,
  ) {
    this.cmdInfo = { name, alias, description, examples, usage };
    this.solve = (args, mentioned, cpi) => Promise.resolve(solve(args, mentioned, cpi));
  }
}
