import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useGetRoleQuery } from "../../../../api/queryHooks";

interface ImportWithStCmdProps {
  ruleId: number;
  roleId: number;
  onImportSuccess?: () => void;
}

export default function ImportWithStCmd({ ruleId, roleId, onImportSuccess }: ImportWithStCmdProps) {
  const handleStCmd = useHandleStCmd(ruleId, roleId);
  const [commandInput, setCommandInput] = useState("");

  const handleImport = () => {
    try {
      const importResult = handleStCmd(commandInput.trim());

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
  };

  return (
    <fieldset className="border border-base-300 rounded-lg p-4">
      <legend className="px-2 font-bold">ST指令导入</legend>
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
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
          </svg>
          导入属性
        </button>
      </div>
    </fieldset>
  );
}

function useHandleStCmd(ruleId: number, roleId: number): (cmd: string) => string {
  const ABILITY_MAP: { [key: string]: string } = {
    str: "力量",
    dex: "敏捷",
    pow: "意志",
    con: "体质",
    app: "外貌",
    edu: "教育",
    siz: "体型",
    int: "智力",
    san: "san值",
    luck: "幸运",
    mp: "魔法",
    hp: "体力",
    cm: "克苏鲁神话",
  };

  const role = useGetRoleQuery(roleId).data?.data;

  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  // 当前规则下激活的能力组
  const curAbility = abilityList.find(a => a.ruleId === ruleId);

  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组

  function handleStCmdInner(cmd: string): string {
    if (!cmd.startsWith(".st") && !cmd.startsWith("。st")) {
      throw new Error("指令必须以 .st 开头");
    }
    cmd = cmd.slice(3).trim();
    const args = cmd.split(/\s+/).filter(arg => arg !== "");
    const input = args.join("");
    const ability: { [key: string]: number } = {};
    // 使用正则匹配所有属性+数值的组合
    const matches = input.matchAll(/(\D+)(\d+)/g);

    // st show 实现，目前仍使用聊天文本返回结果
    // TODO 添加弹出窗口响应`st show`的属性展示
    if (args[0]?.toLowerCase() === "show") {
      if (!curAbility?.ability) {
        return "未设置角色属性";
      }

      const showProps = args.slice(1).filter(arg => arg.trim() !== "");
      if (showProps.length === 0) {
        return "请指定要展示的属性";
      }

      const result: string[] = [];
      for (const prop of showProps) {
        const normalizedKey = prop.toLowerCase();
        const key = ABILITY_MAP[normalizedKey] || prop;
        const value = curAbility.ability[key] ?? 0; // 修改这里，添加默认值0

        result.push(`${key}: ${value}`);
      }

      return `${role?.roleName || "当前角色"}的属性展示：\n${result.join("\n")}`;
    }

    for (const match of matches) {
      const rawKey = match[1].trim();
      const value = Number.parseInt(match[2], 10);

      // 统一转换为小写进行比较
      const normalizedKey = rawKey.toLowerCase();

      // 查找映射关系
      if (ABILITY_MAP[normalizedKey]) {
        ability[ABILITY_MAP[normalizedKey]] = value;
      }
      else {
        ability[rawKey] = value;
      }
    }

    // 如果已存在能力就更新, 不然创建.
    if (curAbility) {
      updateAbilityMutation.mutate({
        abilityId: curAbility.abilityId ?? -1,
        ability,
        act: {},
      });
    }
    else {
      setAbilityMutation.mutate({
        roleId,
        ruleId,
        act: {},
        ability,
      });
    }
    return `更新属性: ${JSON.stringify(ability, null, 2)}`;
  }
  return handleStCmdInner;
}
