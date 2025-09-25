import type { RoomContextType } from "@/components/chat/roomContext";
import type { RuleNameSpace } from "@/components/common/dicer/cmd";
import type { ChatMessageRequest, RoleAbility, UserRole } from "../../../../api";
import CmdExeCoc from "@/components/common/dicer/cmdExeCoc";
import executorDnd from "@/components/common/dicer/cmdExeDnd";
import executorPublic from "@/components/common/dicer/cmdExePublic";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router";
import {
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { tuanchat } from "../../../../api/instance";
import { useGetRoleQuery } from "../../../../api/queryHooks";

const RULES: Map<number, RuleNameSpace> = new Map();
RULES.set(1, CmdExeCoc);
RULES.set(2, executorDnd); // DnD规则

export function isCommand(command: string) {
  const trimmed = command.trim();
  return (trimmed.startsWith(".") || trimmed.startsWith("。"));
}

export function getCommandList(ruleId: number): Map<string, CommandInfo> {
  const cmdList = new Map<string, CommandInfo>();
  const publicCmdList = executorPublic.getCmdList();
  for (const [cmd, info] of publicCmdList) {
    cmdList.set(cmd, info);
  }
  const ruleExecutor = RULES.get(ruleId);
  if (!ruleExecutor) {
    return cmdList;
  }
  const ruleCmdList = ruleExecutor.getCmdList();
  for (const [cmd, info] of ruleCmdList) {
    cmdList.set(cmd, info);
  }
  return cmdList;
}

/**
 * 命令执行器钩子函数
 * @param roleId roleId，会根据ruleId来获取对应角色的ability值
 * @param ruleId 规则ID，会根据ruleId来获取对应角色对应规则下的能力组
 * @param roomContext
 */
export default function useCommandExecutor(roleId: number, ruleId: number, roomContext: RoomContextType) {
  const { spaceId: _, roomId: urlRoomId } = useParams();
  const roomId = Number(urlRoomId);

  const role = useGetRoleQuery(roleId).data?.data;

  const defaultDice = useRef(100);

  // 通过以下的mutation来对后端发送引起数据变动的请求
  const updateAbilityMutation = useUpdateRoleAbilityByRoleIdMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组

  const curRoleId = roomContext.curRoleId; // 当前选中的角色id
  const curAvatarId = roomContext.curAvatarId; // 当前选中的角色的立绘id

  const messageRequest: ChatMessageRequest = {
    roomId,
    messageType: 1,
    content: "",
    extra: {},
  };

  useEffect(() => {
    try {
      defaultDice.current = Number(localStorage.getItem("defaultDice")) ?? 100;
    }
    catch (e) {
      console.error(e);
    }
  }, []);

  /**
   * 返回这个函数
   * @param executorProp
   */
  async function execute(executorProp: ExecutorProp): Promise<void> {
    const command = executorProp.command;
    const [cmdPart, ...args] = parseCommand(command);
    const operator: UserRole = {
      userId: role?.userId ?? -1,
      roleId: role?.roleId ?? -1,
      roleName: role?.roleName ?? "",
      description: role?.description ?? "",
      avatarId: role?.avatarId ?? -1,
      state: 0,
      modelName: role?.modelName ?? "",
      speakerName: role?.speakerName ?? "",
      createTime: "",
    };
    const mentioned: UserRole[] = (executorProp.mentionedRoles || []);
    mentioned.push(operator);
    // 获取角色的能力列表
    const getRoleAbility = async (roleId: number): Promise<RoleAbility> => {
      const abilityQuery = await tuanchat.abilityController.listRoleAbility(roleId);
      const abilityList = abilityQuery.data ?? [];
      const ability = abilityList.find(a => a.ruleId === ruleId);
      return ability || {};
    };
    // 获取所有可能用到的角色能力
    const mentionedRoles = new Map<number, RoleAbility>();
    for (const role of mentioned) {
      mentionedRoles.set(role.userId, role);
      const ability = await getRoleAbility(role.roleId);
      mentionedRoles.set(role.roleId, ability);
    }

    // 定义cpi接口
    const sendMsg = (prop: ExecutorProp, message: string) => {
      messageRequest.extra = {
        result: message,
      };
      messageRequest.content = prop.originMessage;
      messageRequest.roleId = curRoleId;
      messageRequest.avatarId = curAvatarId;
      tuanchat.chatController.sendMessageAiResponse(messageRequest);
    };

    const sendToast = (message: string) => {
      toast(message);
    };

    const getRoleAbilityList = (roleId: number): RoleAbility => {
      if (mentionedRoles.has(roleId)) {
        return mentionedRoles.get(roleId) as RoleAbility;
      }
      return {};
    };

    const setRoleAbilityList = (roleId: number, ability: RoleAbility) => {
      if (!mentionedRoles.has(roleId)) {
        return;
      }
      mentionedRoles.set(roleId, ability);
    };

    const CmdPreInterface = {
      sendMsg,
      sendToast,
      getRoleAbilityList,
      setRoleAbilityList,
    };

    const ruleExecutor = RULES.get(ruleId);
    if (!ruleExecutor) {
      sendToast(`未知规则 ${ruleId}`);
      return;
    }
    try {
      await ruleExecutor.execute(cmdPart, args, mentioned, CmdPreInterface, executorProp);
    }
    catch (err1) {
      try {
        await executorPublic.execute(cmdPart, args, mentioned, CmdPreInterface, executorProp);
      }
      catch (err2) {
        sendToast(`执行错误：${err1 instanceof Error ? err1.message : String(err1)} 且 ${err2 instanceof Error ? err2.message : String(err2)}`);
      }
    }
    // 遍历mentionedRoles，更新角色能力
    for (const [_id, ability] of mentionedRoles) {
      if (ability) {
        updateAbilityMutation.mutate({
          roleId,
          ruleId,
          act: ability.act,
          basic: ability.basic,
          ability: ability.ability,
          skill: ability.skill,
        });
      }
      else {
        setAbilityMutation.mutate({
          roleId,
          ruleId,
          act: {},
          basic: {},
          ability: {},
          skill: {},
        });
      }
    }
  }

  /**
   *解析骰子表达式
   * @const
   */
  function parseCommand(input: string): [string, ...string[]] {
    const trimmed = input.trim().slice(1);
    // 匹配所有的英文字符，取第一个为命令
    const cmdMatch = trimmed.match(/^([A-Z]+)/i);
    const cmdPart = cmdMatch?.[0] ?? "";
    const args = trimmed.slice(cmdPart.length).trim().split(/\s+/).filter(arg => arg !== "");
    return [cmdPart.toLowerCase(), ...args];
  }

  return execute;
}
