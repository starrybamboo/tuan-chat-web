import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import UTILS from "@/components/common/dicer/utils/utils";

const executorDnd = new RuleNameSpace(
  2,
  "dnd",
  ["dnd5e"],
  "D&D 5e 指令集",
);

export default executorDnd;

/**
 * D&D 5e 检测结果接口
 */
interface DndCheckResult {
  value: number;
  type: "Attribute" | "Skill" | "Ability";
  sourceName: string;
  rawValue: number; // 原始数值（属性值或技能总值）
}

/**
 * 获取 D&D 5e 的调整值
 * 优先顺序：Basic (属性) -> Skill (技能) -> Ability (能力)
 */
function getDndModifier(role: RoleAbility, key: string): DndCheckResult | null {
  // 1. Check Basic (Attributes) -> (Score - 10) // 2
  // D&D 5e 属性名通常为：力量, 敏捷, 体质, 智力, 感知, 魅力 (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma)
  // 如果在 basic 中找到，视为属性，需要计算调整值
  const basicVal = UTILS.getRoleAbilityValue(role, key, "basic");
  if (basicVal) {
    const score = parseInt(basicVal);
    if (!isNaN(score)) {
      return {
        value: Math.floor((score - 10) / 2),
        type: "Attribute",
        sourceName: key,
        rawValue: score
      };
    }
  }

  // 2. Check Skill -> Direct Value
  // 技能通常直接存储最终加值
  const skillVal = UTILS.getRoleAbilityValue(role, key, "skill");
  if (skillVal) {
    const mod = parseInt(skillVal);
    if (!isNaN(mod)) {
      return {
        value: mod,
        type: "Skill",
        sourceName: key,
        rawValue: mod
      };
    }
  }

  // 3. Check Ability -> Direct Value
  // 能力（如先攻）通常也是直接数值
  const abilityVal = UTILS.getRoleAbilityValue(role, key, "ability");
  if (abilityVal) {
    const mod = parseInt(abilityVal);
    if (!isNaN(mod)) {
      return {
        value: mod,
        type: "Ability",
        sourceName: key,
        rawValue: mod
      };
    }
  }

  return null;
}

/**
 * 掷骰核心逻辑
 * @param type 'normal' | 'advantage' | 'disadvantage'
 */
function rollD20(type: "normal" | "advantage" | "disadvantage" = "normal"): { total: number; rolls: number[]; detailedMsg: string } {
  const roll = () => Math.floor(Math.random() * 20) + 1;
  
  if (type === "normal") {
    const r = roll();
    return { total: r, rolls: [r], detailedMsg: `1d20(${r})` };
  }
  else if (type === "advantage") {
    const r1 = roll();
    const r2 = roll();
    const total = Math.max(r1, r2);
    return { total, rolls: [r1, r2], detailedMsg: `2d20kh1(${r1}, ${r2} -> ${total})` };
  }
  else { // disadvantage
    const r1 = roll();
    const r2 = roll();
    const total = Math.min(r1, r2);
    return { total, rolls: [r1, r2], detailedMsg: `2d20kl1(${r1}, ${r2} -> ${total})` };
  }
}

/**
 * 通用检定处理器
 */
async function handleCheck(
  args: string[], 
  mentioned: UserRole[], 
  cpi: CPI, 
  mode: "normal" | "advantage" | "disadvantage" = "normal",
  checkType: "general" | "save" = "general"
): Promise<boolean> {
  const role = mentioned[0];
  if (!role) {
    cpi.sendToast("未指定角色");
    return false;
  }
  
  const curAbility = await cpi.getRoleAbilityList(role.roleId);
  
  // 解析参数
  let name = "";
  let expression = "";
  
  const argsStr = args.join("").trim();
  
  // 匹配开头的中文字符或英文字符作为名字
  const nameMatch = argsStr.match(/^([\u4e00-\u9fa5a-zA-Z]+)(.*)/);
  
  if (nameMatch) {
    name = nameMatch[1];
    expression = nameMatch[2];
  }
  else {
    expression = argsStr;
  }
  
  let modifier = 0;
  let modifierDesc = "";
  
  // 查找属性/技能
  if (name) {
    const modData = getDndModifier(curAbility, name);
    if (modData) {
      modifier = modData.value;
      if (modData.type === "Attribute") {
        modifierDesc = `${name}调整值(${modifier >= 0 ? "+" : ""}${modifier})`;
      }
      else {
        modifierDesc = `${name}(${modifier >= 0 ? "+" : ""}${modifier})`;
      }
    }
    else {
      modifierDesc = `${name}?`;
    }
  }
  
  // 额外调整值 (expression)
  let extraMod = 0;
  if (expression) {
    try {
      // 尝试简单解析纯数字
      const cleanExpr = expression.replace(/\s/g, "");
      if (/^[+-]?\d+$/.test(cleanExpr)) {
        extraMod = parseInt(cleanExpr);
      }
      else {
          // 如果 UTILS.calculateExpression 可用且安全，则使用它
          // 这里假设 UTILS.calculateExpression 适用于简单的数学运算
          const value = UTILS.calculateExpression(expression, curAbility);
          if (!isNaN(value)) {
            extraMod = value;
          }
      }
    }
    catch (e) {
      // 忽略解析错误
    }
  }
  
  const diceResult = rollD20(mode);
  const total = diceResult.total + modifier + extraMod;
  
  let actionName = checkType === "save" ? "豁免" : "检定";
  let title = name ? `${name}${actionName}` : `${actionName}`;
  
  if (checkType === "save" && !name) {
    title = "豁免检定";
  }
  
  let formulaStr = `${diceResult.detailedMsg}`;
  if (modifierDesc && modifier !== 0) {
    formulaStr += ` + ${modifierDesc}`;
  }
  if (extraMod !== 0) {
    formulaStr += ` ${extraMod > 0 ? "+" : ""}${extraMod}`;
  }
  
  const msg = `${role.roleName} 进行了 ${title}: ${formulaStr} = ${total}`;
  cpi.replyMessage(msg);
  
  return true;
}

// 1. 属性/技能检定 (.ra / .rc)
const cmdRa = new CommandExecutor(
  "ra",
  ["rc"],
  "属性/技能检定",
  [".ra 力量", ".ra 运动", ".ra 力量+2"],
  ".ra [属性/技能名] [调整值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return handleCheck(args, mentioned, cpi, "normal", "general");
  },
);
executorDnd.addCmd(cmdRa);

// 2. 豁免检定 (.rs)
const cmdRs = new CommandExecutor(
  "rs",
  [],
  "豁免检定",
  [".rs 敏捷", ".rs 体质"],
  ".rs [属性名] [调整值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return handleCheck(args, mentioned, cpi, "normal", "save");
  },
);
executorDnd.addCmd(cmdRs);

// 3. 先攻 (.ri)
const cmdRi = new CommandExecutor(
  "ri",
  [],
  "投掷先攻",
  [".ri", ".ri +2"],
  ".ri [调整值]?",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    const role = mentioned[0];
    if (!role) {
      cpi.sendToast("未指定角色");
      return false;
    }
    const curAbility = await cpi.getRoleAbilityList(role.roleId);
    
    // 优先查找 "先攻" 或 "Initiative"
    let initMod = 0;
    let desc = "";
    
    const initKeys = ["先攻", "Initiative", "initiative", "Init", "init"];
    let found = false;
    
    for (const key of initKeys) {
      const val = UTILS.getRoleAbilityValue(curAbility, key, "ability") || UTILS.getRoleAbilityValue(curAbility, key, "skill");
      if (val) {
        initMod = parseInt(val);
        if (!isNaN(initMod)) {
            desc = `${key}(${initMod})`;
            found = true;
            break;
        }
      }
    }
    
    // 如果没找到先攻，尝试用敏捷调整值
    if (!found) {
      const dexKeys = ["敏捷", "Dexterity", "Dex", "dex"];
      for (const key of dexKeys) {
        const val = getDndModifier(curAbility, key);
        if (val && val.type === "Attribute") {
            initMod = val.value;
            desc = `${key}调整值(${initMod})`;
            found = true;
            break;
        }
      }
    }
    
    // 额外调整
    const argsStr = args.join("");
    let extraMod = 0;
    if (argsStr) {
       try {
         const val = UTILS.calculateExpression(argsStr, curAbility);
         if (!isNaN(val)) extraMod = val;
       } catch (e) {}
    }
    
    const diceResult = rollD20("normal");
    const total = diceResult.total + initMod + extraMod;
    
    let formulaStr = `${diceResult.detailedMsg}`;
    if (desc) formulaStr += ` + ${desc}`;
    if (extraMod !== 0) formulaStr += ` ${extraMod > 0 ? "+" : ""}${extraMod}`;

    // 更新先攻列表逻辑 (需结合 RoomContext 或其他机制，此处仅显示)
    // 如果需要自动加入先攻列表，需调用相关API。由于API未明确提供，此处暂只打印。
    
    cpi.replyMessage(`${role.roleName} 投掷先攻: ${formulaStr} = ${total}`);
    return true;
  },
);
executorDnd.addCmd(cmdRi);

// 4. 优势检定 (.rab / .rcb)
const cmdRab = new CommandExecutor(
  "rab",
  ["rcb"],
  "优势检定",
  [".rab 隐匿", ".rab 力量"],
  ".rab [属性/技能名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return handleCheck(args, mentioned, cpi, "advantage", "general");
  },
);
executorDnd.addCmd(cmdRab);

// 5. 劣势检定 (.rap / .rcp)
const cmdRap = new CommandExecutor(
  "rap",
  ["rcp"],
  "劣势检定",
  [".rap 隐匿", ".rap 力量"],
  ".rap [属性/技能名]",
  async (args: string[], mentioned: UserRole[], cpi: CPI): Promise<boolean> => {
    return handleCheck(args, mentioned, cpi, "disadvantage", "general");
  },
);
executorDnd.addCmd(cmdRap);
