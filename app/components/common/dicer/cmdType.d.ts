interface CommandInfo { // eslint-disable-line ts/consistent-type-definitions
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
}

/**
 * 聊天室部分调用executor的时候, 会传这么一个结构体进去
 */
interface ExecutorProp { // eslint-disable-line ts/consistent-type-definitions
  /**
   * 房间ID
   */
  roomId?: number;
  /**
   * thread id（用于消息线程聚合）；为空表示主消息流
   */
  threadId?: number;
  /**
   * 完整的原始消息
   */
  originMessage?: string;
  /**
   * 指令消息id;
   * 用于后续的指令回复,避免消息混乱;
   */
  replyMessageId?: number;
  /**
   * 骰娘的角色ID
   */
  dicerRoleId?: number;
  /**
   * 骰娘的头像ID
   */
  dicerAvatarId?: number;
  /**
   * 命令的主体, 不带前置的标点, 即中英文句号，也不包含@的人
   */
  command: string;
  /**
   * 聊天框中@的角色
   */
  mentionedRoles?: UserRole[];
}

interface CPI { // eslint-disable-line ts/consistent-type-definitions
  /**
   * 回复消息到聊天框
   * @param {string} msg - 要发送的消息
   * @return {void}
   * 说明：调用此方法发送消息会严格按照调用次序发送，发送的消息会回复原始指令消息。
   */
  replyMessage: (msg: string) => void;
  /**
   * 获取指定用户的角色信息
   * @param {number} userId - 用户ID
   * @returns {UserRole} 用户角色信息，如果不存在则返回一个空对象
   */
  getRoleAbilityList: (roleId: number) => RoleAbility;
  /**
   * 设置指定用户的角色能力列表
   * @param {number} roleId - 角色ID
   * @param {RoleAbility} abilityList - 角色能力列表
   * @return {void}
   */
  setRoleAbilityList: (roleId: number, abilityList: RoleAbility) => void;
  /**
   * 发送Toast消息
   * @param {string} msg - 要发送的消息
   * @return {void}
   * 说明：调用此方法时原始指令不会发送到群聊中，并且唤起弹窗后会自动关闭
   */
  sendToast: (msg: string) => void;

  /**
   * 设置文案键，从骰娘 extra.copywriting 中随机抽取对应文案
   * @param {string | null} key - 文案分组键；传 null 或空字符串表示不附加文案
   * @return {void}
   */
  setCopywritingKey: (key: string | null) => void;

  /**
   * 获取空间信息
   * @returns {Space | null | undefined} 完整的空间信息对象
   */
  getSpaceInfo: () => Space | null | undefined;

  /**
   * 获取空间 dicerData 中指定键的值
   * @param {string} key - 要获取的键名
   * @returns {string | undefined} 键对应的值，如果不存在则返回 undefined
   */
  getSpaceData: (key: string) => string | undefined;

  /**
   * 设置或删除空间 dicerData 中的键值
   * @param {string} key - 要设置的键名
   * @param {string | null} value - 要设置的值；传 null 时删除该键
   * @return {void}
   */
  setSpaceData: (key: string, value: string | null) => void;
}

interface RoleAbility { // eslint-disable-line ts/consistent-type-definitions
  abilityId?: number;
  roleId?: number;
  ruleId?: number;
  act?: Record<string, string>;
  basic?: Record<string, string>;
  ability?: Record<string, string>;
  skill?: Record<string, string>;
  record?: Record<string, string>;
  extra?: Record<string, string>;
}

interface UserRole { // eslint-disable-line ts/consistent-type-definitions
  userId: number;
  roleId: number;
  roleName?: string;
  description?: string;
  avatarId?: number;
  state?: number;
  type: number;
  modelName?: string;
  speakerName?: string;
  extra?: Record<string, string>;
  createTime?: string;
  updateTime?: string;
  voiceUrl?: string;
}

interface CommandInfo { // eslint-disable-line ts/consistent-type-definitions
  name: string;
  alias: string[];
  description: string;
  examples: string[];
  usage: string;
}

/**
 * 规则命名空间类，用于管理和执行一组相关命令
 *
 * @property {number} id - 命名空间的唯一标识符
 * @property {string} name - 命名空间名称
 * @property {string[]} alias - 命名空间别名数组
 * @property {string} description - 命名空间描述
 * @property {Map<string, CommandExecutor>} cmdMap - 命令映射表，存储命令名称/别名与执行器的映射
 *
 * @example
 * // 创建一个coc7th命名空间
 * const combatRules = new RuleNameSpace(
 *   0,
 *   "coc7th",
 *   ["coc", "coc7"],
 *   "规则coc7th的指令集"
 * );
 *
 * // 添加一个先攻命令
 * combatRules.addCmd(new CmdExecutor(
 *   "ri", ["init", "先攻"],
 *   "进行先攻检定",
 *   ["ri 力量", "ri +2 敏捷"],
 *   "ri [属性名|骰子表达式]",
 *   handleRi
 * ));
 */
interface RuleNameSpace { // eslint-disable-line ts/consistent-type-definitions
  id: number;
  name: string;
  alias: string[];
  description: string;
  cmdMap: Map<string, CommandExecutor>;
  aliasMap: Map<string, string>;

  /**
   * 添加命令到命名空间
   * @param {CommandExecutor} cmd - 要添加的命令执行器
   */
  addCmd: (cmd: CommandExecutor) => void;

  /**
   * 获取命令信息
   * @param {string} name - 命令名称或别名
   * @returns {CommandInfo | undefined} 命令信息对象，如果不存在则返回undefined
   */
  getCmd: (name: string) => CommandInfo | undefined;

  /**
   * 获取命名空间下所有命令的列表
   * @returns {CommandInfo[]} 命令信息数组
   */
  getCmdList: () => CommandInfo[];

  /**
   * 执行命令
   * @param {string} name - 命令名称或别名
   * @param {string[]} args - 命令参数数组
   * @param {UserRole} operator - 操作者信息
   * @param {UserRole[]} Ats - At列表信息数组
   * @param {CPI} cpi -CmdPre接口对象
   * @returns {boolean} 命令执行结果
   * @throws {Error} 当命令不存在时抛出错误
   */
  execute: (name: string, args: string[], operator: UserRole, Ats: UserRole[], cpi: CPI) => boolean;
}

/**
 * 命令执行器类，封装命令信息和执行逻辑
 *
 * @property {CommandInfo} cmdInfo - 命令的元信息
 * @property {Function} solve - 命令执行函数，接收参数数组并返回执行结果
 */
interface CommandExecutor { // eslint-disable-line ts/consistent-type-definitions
  cmdInfo: CommandInfo;
  solve: (args: string[], operator: UserRole, Ats: UserRole[], cpi: CPI) => boolean;
}
