import { CopyIcon, EditIcon } from "app/icons";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateKeyFieldByRoleIdMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "../../../../api/hooks/ruleQueryHooks";

interface ImportWithStCmdProps {
  ruleId: number;
  roleId: number;
  onImportSuccess?: () => void;
}

export default function ImportWithStCmd({ ruleId, roleId, onImportSuccess }: ImportWithStCmdProps) {
  const handleStCmd = useHandleStCmd(ruleId, roleId);
  const [commandInput, setCommandInput] = useState("");
  const isCOC7 = ruleId === 1; // COC7规则ID为1
  const abilityQuery = useGetRoleAbilitiesQuery(roleId);

  const handleImport = () => {
    void (async () => {
      try {
        const importResult = await handleStCmd(commandInput.trim());

        // 处理结果格式
        let formattedResult = importResult
          .replace(/[\n\r]/g, "") // 去掉换行
          .replace(/[{}]/g, ""); // 去掉大括号

        // 统计属性数量并格式化
        const props = formattedResult.split(",");
        const propCount = props.length;
        if (propCount > 5) {
          formattedResult = `${props.slice(0, 5).join(",")}等`;
        }

        // 添加总数信息
        formattedResult += `共${propCount}项属性`;

        toast.success(formattedResult, {
          duration: 4000,
          position: "top-center",
        });
        setCommandInput("");
        onImportSuccess?.();
      }
      catch (error) {
        toast.error(`导入失败: ${error instanceof Error ? error.message : "指令格式有误"}`, {
          duration: 4000,
          position: "top-center",
        });
      }
    })();
  };

  const handleExport = () => {
    const abilityList = abilityQuery.data?.data ?? [];
    const curAbility = abilityList.find(a => a.ruleId === ruleId);

    if (!curAbility?.skill) {
      toast.error("暂无属性可导出", { duration: 2000 });
      return;
    }

    const ABILITY_MAP: { [key: string]: string } = {
      力量: "str",
      敏捷: "dex",
      意志: "pow",
      体质: "con",
      外貌: "app",
      教育: "edu",
      体型: "siz",
      智力: "int",
      sanֵ: "san",
      幸运: "luck",
      魔法: "mp",
      体力: "hp",
      克苏鲁神话: "cm",
    };

    const parts: string[] = [];
    for (const [key, value] of Object.entries(curAbility.skill)) {
      const abbr = ABILITY_MAP[key] || key;
      parts.push(`${abbr}${value}`);
    }

    const stCmd = `.st ${parts.join(" ")}`;
    navigator.clipboard.writeText(stCmd);
    toast.success("ST指令已复制到剪贴板", { duration: 2000 });
  };

  return (
    <div className="space-y-4">
      <fieldset className="border border-base-300 rounded-lg p-4">
        <div className="relative w-full">
          <textarea
            className="bg-base-200 rounded-lg p-4 w-full h-40 overflow-auto resize-none"
            placeholder="输入.st指令导入属性（例：.st 力量80 敏捷70 意志50）"
            value={commandInput}
            onChange={e => setCommandInput(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-accent absolute bottom-4 right-2"
            onClick={handleImport}
            disabled={!commandInput.trim()}
          >
            <EditIcon className="w-4 h-4" />
            导入属性
          </button>
        </div>
      </fieldset>

      {isCOC7 && (
        <div className="flex justify-end">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExport}
          >
            <CopyIcon className="w-4 h-4" />
            导出ST指令
          </button>
        </div>
      )}
    </div>
  );
}

interface StAbilityDraft {
  abilityId?: number;
  act: Record<string, string>;
  basic: Record<string, string>;
  ability: Record<string, string>;
  skill: Record<string, string>;
}

function useHandleStCmd(ruleId: number, roleId: number): (cmd: string) => Promise<string> {
  const ABILITY_MAP: { [key: string]: string } = {
    str: "力量",
    dex: "敏捷",
    pow: "意志",
    con: "体质",
    app: "外貌",
    edu: "教育",
    siz: "体型",
    int: "智力",
    san: "sanֵ",
    luck: "幸运",
    mp: "魔法",
    魔法值上限: "mpm",
    体力: "hp",
    体力值: "hp",
    生命值: "hp",
    最大生命值: "hpm",
    理智值上限: "sanm",
    理智上限: "sanm",
    cm: "克苏鲁神话",
    克苏鲁: "克苏鲁神话",
    计算机: "计算机使用",
    电脑: "计算机使用",
    灵感: "智力",
    理智: "sanֵ",
    理智值: "sanֵ",
    运气: "幸运",
    驾驶: "汽车驾驶",
    汽车: "汽车驾驶",
    图书馆: "图书馆使用",
    开锁: "锁匠",
    撬锁: "锁匠",
    领航: "导航",
    重型操作: "操作重型机械",
    重型机械: "操作重型机械",
    重型: "操作重型机械",
    侦察: "侦查",
  };
  const ABILITY_FALLBACK_KEYS = new Set([
    "hp",
    "mp",
    "san",
    "sanֵ",
    "hpm",
    "mpm",
    "sanm",
    "db",
    "护甲",
  ]);

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  const ruleDetailQuery = useRuleDetailQuery(ruleId);

  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const updateKeyFieldByRoleIdMutation = useUpdateKeyFieldByRoleIdMutation(); // 删除错位字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组

  function buildAbilityDraft(): { draft: StAbilityDraft; shouldUpdate: boolean } {
    const currentAbility = abilityList.find(a => a.ruleId === ruleId);
    const draft: StAbilityDraft = {
      abilityId: currentAbility?.abilityId,
      // 保持历史行为：只基于现有能力组进行覆盖，不自动灌入规则模板。
      act: { ...(currentAbility?.act ?? {}) },
      basic: { ...(currentAbility?.basic ?? {}) },
      ability: { ...(currentAbility?.ability ?? {}) },
      skill: { ...(currentAbility?.skill ?? {}) },
    };
    const shouldUpdate = (draft.abilityId ?? 0) > 0;
    return { draft, shouldUpdate };
  }

  const basicTemplateKeys = new Set(Object.keys(ruleDetailQuery.data?.basicDefault ?? {}));
  const abilityTemplateKeys = new Set(Object.keys(ruleDetailQuery.data?.abilityFormula ?? {}));
  const skillTemplateKeys = new Set(Object.keys(ruleDetailQuery.data?.skillDefault ?? {}));

  function resolveFieldForKey(draft: StAbilityDraft, key: string): "basic" | "ability" | "skill" {
    // 优先沿用当前数据所在分组，避免无意义漂移
    if (key in draft.basic)
      return "basic";
    if (key in draft.ability)
      return "ability";
    if (key in draft.skill)
      return "skill";

    // 若当前分组没有该键，按规则模板归类
    if (basicTemplateKeys.has(key))
      return "basic";
    if (abilityTemplateKeys.has(key))
      return "ability";
    if (skillTemplateKeys.has(key))
      return "skill";

    // 模板未覆盖时，能力兜底键留在 ability，其余进入 skill
    if (ABILITY_FALLBACK_KEYS.has(key.toLowerCase()) || ABILITY_FALLBACK_KEYS.has(key))
      return "ability";
    return "skill";
  }

  function getFieldValue(draft: StAbilityDraft, field: "basic" | "ability" | "skill", key: string): string {
    if (field === "basic")
      return draft.basic[key] ?? "0";
    if (field === "ability")
      return draft.ability[key] ?? "0";
    return draft.skill[key] ?? "0";
  }

  function setFieldValue(draft: StAbilityDraft, field: "basic" | "ability" | "skill", key: string, value: string): void {
    if (field === "basic") {
      draft.basic[key] = value;
      return;
    }
    if (field === "ability") {
      draft.ability[key] = value;
      return;
    }
    draft.skill[key] = value;
  }

  function normalizeMisplacedAbilityFields(draft: StAbilityDraft): Set<string> {
    const toDelete = new Set<string>();
    // 已有污染数据自愈：能力区里落到了“基础/技能模板键”的字段，迁回对应分组
    for (const [key, value] of Object.entries(draft.ability)) {
      if (!abilityTemplateKeys.has(key) && basicTemplateKeys.has(key)) {
        draft.basic[key] = draft.basic[key] ?? value;
        toDelete.add(key);
      }
      else if (!abilityTemplateKeys.has(key) && skillTemplateKeys.has(key)) {
        draft.skill[key] = draft.skill[key] ?? value;
        toDelete.add(key);
      }
    }
    return toDelete;
  }

  async function handleStCmdInner(cmd: string): Promise<string> {
    if (!cmd.startsWith(".st") && !cmd.startsWith("。st")) {
      throw new Error("指令必须以 .st 开头");
    }
    cmd = cmd.slice(3).trim();
    const args = cmd.split(/\s+/).filter(arg => arg !== "");
    const input = args.join("");
    const { draft, shouldUpdate } = buildAbilityDraft();
    const abilityFieldsToDelete = normalizeMisplacedAbilityFields(draft);

    // 支持 .st 力量70 / .st 力量+10 / .st 敏捷-5 这三种写法
    const matches = input.matchAll(/([^\d+-]+)([+-]?)(\d+)/g);
    const abilityToUpdate = new Map<string, string>();
    let matchCount = 0;
    for (const match of matches) {
      matchCount += 1;
      const rawKey = match[1].trim();
      const operator = match[2];
      const value = Number.parseInt(match[3], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();
      const key = ABILITY_MAP[normalizedKey] || rawKey;
      const targetField = resolveFieldForKey(draft, key);
      const currentValue = Number.parseInt(getFieldValue(draft, targetField, key), 10);
      let newValue: number;
      if (operator === "+") {
        newValue = currentValue + value;
      }
      else if (operator === "-") {
        newValue = currentValue - value;
      }
      else {
        newValue = value;
      }

      setFieldValue(draft, targetField, key, String(newValue));
      if (targetField !== "ability" && key in draft.ability && !abilityTemplateKeys.has(key)) {
        abilityFieldsToDelete.add(key);
      }
      abilityToUpdate.set(key, String(newValue));
    }

    if (matchCount === 0) {
      throw new Error("未解析到属性，请检查格式（例：.st 力量80 敏捷+10）");
    }

    // 已存在能力则更新，否则创建，并保留本次导入后的字段内容
    if (shouldUpdate) {
      await updateAbilityMutation.mutateAsync({
        abilityId: draft.abilityId as number,
        act: draft.act,
        basic: draft.basic,
        ability: draft.ability,
        skill: draft.skill,
      });

      if (abilityFieldsToDelete.size > 0) {
        const deleteMap: Record<string, string> = {};
        for (const key of abilityFieldsToDelete) {
          // 后端约定：value 为 null 代表删除该键
          deleteMap[key] = null as unknown as string;
        }
        await updateKeyFieldByRoleIdMutation.mutateAsync({
          roleId,
          ruleId,
          abilityFields: deleteMap,
        });
      }
    }
    else {
      await setAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        act: draft.act,
        basic: draft.basic,
        ability: draft.ability,
        skill: draft.skill,
      });
    }
    return `更新属性: ${JSON.stringify(abilityToUpdate, null, 2)}`;
  }
  return handleStCmdInner;
}
