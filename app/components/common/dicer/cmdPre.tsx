import type { RoomContextType } from "@/components/chat/roomContext";
import type { RuleNameSpace } from "@/components/common/dicer/cmd";
import type { ChatMessageRequest, RoleAbility, RoleAvatar, UserRole } from "../../../../api";
import executorCoc from "@/components/common/dicer/cmdExe/cmdExeCoc";
import executorDnd from "@/components/common/dicer/cmdExe/cmdExeDnd";
import executorFu from "@/components/common/dicer/cmdExe/cmdExeFu";
import executorPublic from "@/components/common/dicer/cmdExe/cmdExePublic";
import UTILS from "@/components/common/dicer/utils/utils";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router";
import {
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityByRoleIdMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useSendMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../api/instance";
import { useGetRoleQuery } from "../../../../api/queryHooks";

const RULES: Map<number, RuleNameSpace> = new Map();
RULES.set(1, executorCoc); // CoC规则
RULES.set(2, executorDnd); // DnD规则
RULES.set(3, executorFu); // 最终物语规则

const ALIAS_MAP_SET: { [key: string]: Map<string, string> } = {
  1: executorCoc.aliasMap,
  2: executorDnd.aliasMap,
  3: executorFu.aliasMap,
};

UTILS.initAliasMap(ALIAS_MAP_SET);

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
  const sendMessageMutation = useSendMessageMutation(roomId); // 发送消息

  const curRoleId = roomContext.curRoleId; // 当前选中的角色id
  const curAvatarId = roomContext.curAvatarId; // 当前选中的角色的立绘id
  const dicerMessageQueue: string[] = []; // 记录本次指令骰娘的消息队列
  const dicePrivateMessageQueue: string[] = []; // 记录本次指令骰娘的私聊消息队列
  // 当前指令期望使用的文案键（不再使用Ref；改为execute内局部变量一次性处理）

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
    let copywritingKey: string | null = null;
    const [cmdPart, ...args] = parseCommand(command);
    const operator: UserRole = {
      userId: role?.userId ?? -1,
      roleId: role?.roleId ?? -1,
      roleName: role?.roleName ?? "",
      description: role?.description ?? "",
      avatarId: role?.avatarId ?? -1,
      state: 0,
      type: 0,
      modelName: role?.modelName ?? "",
      speakerName: role?.speakerName ?? "",
      createTime: "",
    };
    const mentioned: UserRole[] = (executorProp.mentionedRoles || []);
    mentioned.push(operator);
    // 获取角色的能力列表
    const getRoleAbility = async (roleId: number): Promise<RoleAbility> => {
      try {
        const abilityQuery = await tuanchat.abilityController.getByRuleAndRole(ruleId, roleId);
        const ability = abilityQuery.data;
        return ability || {};
      }
      catch (e) {
        console.error(`获取角色能力失败：${e instanceof Error ? e.message : String(e)},roleId:${roleId},ruleId:${ruleId}`);
        return {};
      }
    };
    // 获取所有可能用到的角色能力
    const mentionedRoles = new Map<number, RoleAbility>();
    for (const role of mentioned) {
      const ability = await getRoleAbility(role.roleId);
      mentionedRoles.set(role.roleId, ability);
    }

    // 定义cpi接口
    const replyMessage = (message: string) => {
      dicerMessageQueue.push(message);
    };

    const replyPrivateMessage = (message: string) => {
      dicePrivateMessageQueue.push(message);
    };

    const sendToast = (message: string) => {
      toast(message);
    };

    // 设置文案键，用于从骰娘 extra.copywriting 中随机抽取文案
    const setCopywritingKey = (key: string | null) => {
      copywritingKey = key?.trim() || null;
    };

    const getRoleAbilityList = (roleId: number): RoleAbility => {
      if (mentionedRoles.has(roleId)) {
        const ability = mentionedRoles.get(roleId) as RoleAbility;
        ability.roleId = ability.roleId ?? roleId;
        ability.ruleId = ability.ruleId ?? ruleId;
        return ability;
      }
      return { roleId, ruleId };
    };

    const setRoleAbilityList = (roleId: number, ability: RoleAbility) => {
      ability.roleId = ability.roleId ?? roleId;
      ability.ruleId = ability.ruleId ?? ruleId;
      mentionedRoles.set(roleId, ability);
    };

    const CmdPreInterface = {
      replyMessage,
      replyPrivateMessage,
      sendToast,
      getRoleAbilityList,
      setRoleAbilityList,
      setCopywritingKey,
    };

    const ruleExecutor = RULES.get(ruleId);
    if (!ruleExecutor) {
      sendToast(`未知规则 ${ruleId}`);
      return;
    }
    try {
      await ruleExecutor.execute(cmdPart, args, mentioned, CmdPreInterface);
    }
    catch (err1) {
      try {
        await executorPublic.execute(cmdPart, args, mentioned, CmdPreInterface);
      }
      catch (err2) {
        sendToast(`执行错误：${err1 instanceof Error ? err1.message : String(err1)} 且 ${err2 instanceof Error ? err2.message : String(err2)}`);
      }
    }
    // 遍历mentionedRoles，更新或创建角色能力
    for (const [id, ability] of mentionedRoles) {
      // 构造请求payload时，确保所有字段为非null对象，避免后端校验失败
      const payload = {
        roleId: id,
        ruleId,
        act: ability?.act ?? {},
        basic: ability?.basic ?? {},
        ability: ability?.ability ?? {},
        skill: ability?.skill ?? {},
        record: ability?.record ?? {},
        extra: ability?.extra ?? {},
      };

      // 如果后端返回了 abilityId，说明已存在记录，调用更新接口；否则调用创建接口
      if (ability && (ability.abilityId ?? 0) > 0) {
        updateAbilityMutation.mutate(payload);
      }
      else {
        setAbilityMutation.mutate(payload);
      }
    }
    // 发送消息队列
    if (dicerMessageQueue.length > 0) {
      // 当消息队列不为空时，先发送指令消息。
      const messageRequest: ChatMessageRequest = {
        roomId,
        messageType: 1,
        content: executorProp.originMessage,
        roleId: curRoleId,
        avatarId: curAvatarId,
        extra: {},
      };
      const optMsgRes = await sendMessageMutation.mutateAsync(messageRequest);

      const dicerRoleId = await UTILS.getDicerRoleId(roomContext);
      const avatars: RoleAvatar[] = (await tuanchat.avatarController.getRoleAvatars(dicerRoleId))?.data ?? [];

      // 获取文案：从 extra.copywriting 中根据键随机抽取
      let copywritingSuffix = "";
      if (copywritingKey) {
        try {
          const dicerAbility = await tuanchat.abilityController.getByRuleAndRole(ruleId, dicerRoleId);
          const copywritingStr = dicerAbility?.data?.extra?.copywriting || "{}";
          const copywritingMap: Record<string, string[]> = JSON.parse(copywritingStr);
          const texts = copywritingMap[copywritingKey];
          if (texts && texts.length > 0) {
            // 解析权重并构建加权数组
            const weightedTexts: string[] = [];
            for (const text of texts) {
              // 匹配权重语法 ::N::
              const weightMatch = text.match(/^::(\d+)::/);
              if (weightMatch) {
                const weight = Number.parseInt(weightMatch[1]);
                const actualText = text.slice(weightMatch[0].length); // 移除权重前缀
                // 根据权重添加多次
                for (let i = 0; i < weight; i++) {
                  weightedTexts.push(actualText);
                }
              }
              else {
                // 无权重语法，默认权重为 1
                weightedTexts.push(text);
              }
            }
            // 从加权数组中随机选择
            const randomIdx = Math.floor(Math.random() * weightedTexts.length);
            copywritingSuffix = `\n${weightedTexts[randomIdx]}`;
          }
        }
        catch (e) {
          console.error("获取骰娘文案失败:", e);
        }
      }

      // 从所有消息中提取标签（格式：#标签#）
      const allMessages = dicerMessageQueue.join(" ") + copywritingSuffix;
      const tagMatches = allMessages.match(/#([^#]+)#/g);
      let lastTag: string | null = null;
      if (tagMatches && tagMatches.length > 0) {
        // 取最后一个标签，去除 # 符号
        const lastMatch = tagMatches[tagMatches.length - 1];
        lastTag = lastMatch.replace(/#/g, "").trim();
      }

      // 根据标签选择头像
      let matchedAvatar: RoleAvatar | null = null;
      if (lastTag) {
        const matches = avatars.filter(a => (a.avatarTitle?.label || "") === lastTag);
        if (matches.length > 1) {
          // 随机选择一个重复标签的头像
          const idx = Math.floor(Math.random() * matches.length);
          matchedAvatar = matches[idx] || null;
        }
        else {
          matchedAvatar = matches[0] || null;
        }
      }
      // 当没有标签或未匹配时，优先使用 label 为"默认"的头像，其次使用第一个头像
      const fallbackDefaultLabelAvatar = avatars.find(a => (a.avatarTitle?.label || "") === "默认") || null;
      const chosenAvatarId = (matchedAvatar?.avatarId)
        ?? (fallbackDefaultLabelAvatar?.avatarId)
        ?? (avatars[0]?.avatarId ?? 0);

      const dicerMessageRequest: ChatMessageRequest = {
        roomId,
        messageType: 1,
        roleId: dicerRoleId,
        avatarId: chosenAvatarId,
        content: "",
        replayMessageId: optMsgRes.data?.messageId ?? undefined,
        extra: {},
      };
      for (const message of dicerMessageQueue) {
        // 移除消息中的所有标签（格式：#标签#）
        const cleanMessage = message.replace(/#[^#]+#/g, "").trim();
        const cleanCopywriting = copywritingSuffix.replace(/#[^#]+#/g, "").trim();
        dicerMessageRequest.content = cleanMessage + (cleanCopywriting ? `\n${cleanCopywriting}` : "");
        await sendMessageMutation.mutateAsync(dicerMessageRequest);
      }
    }

    // 发送私聊消息队列
    if (dicePrivateMessageQueue.length > 0) {
      const messageRequest: ChatMessageRequest = {
        roomId,
        messageType: 1,
        content: "",
        extra: {},
        roleId: curRoleId,
        avatarId: curAvatarId,
      };
      const optMsgRes = await sendMessageMutation.mutateAsync(messageRequest);

      const dicerRoleId = await UTILS.getDicerRoleId(roomContext);
      const avatars: RoleAvatar[] = (await tuanchat.avatarController.getRoleAvatars(dicerRoleId))?.data ?? [];

      // 获取文案：从 extra.copywriting 中根据键随机抽取
      let copywritingSuffix = "";
      if (copywritingKey) {
        try {
          const dicerAbility = await tuanchat.abilityController.getByRuleAndRole(ruleId, dicerRoleId);
          const copywritingStr = dicerAbility?.data?.extra?.copywriting || "{}";
          const copywritingMap: Record<string, string[]> = JSON.parse(copywritingStr);
          const texts = copywritingMap[copywritingKey];
          if (texts && texts.length > 0) {
            // 解析权重并构建加权数组
            const weightedTexts: string[] = [];
            for (const text of texts) {
              // 匹配权重语法 ::N::
              const weightMatch = text.match(/^::(\d+)::/);
              if (weightMatch) {
                const weight = Number.parseInt(weightMatch[1]);
                const actualText = text.slice(weightMatch[0].length); // 移除权重前缀
                // 根据权重添加多次
                for (let i = 0; i < weight; i++) {
                  weightedTexts.push(actualText);
                }
              }
              else {
                // 无权重语法，默认权重为 1
                weightedTexts.push(text);
              }
            }
            // 从加权数组中随机选择
            const randomIdx = Math.floor(Math.random() * weightedTexts.length);
            copywritingSuffix = `\n${weightedTexts[randomIdx]}`;
          }
        }
        catch (e) {
          console.error("获取骰娘文案失败:", e);
        }
      }

      // 从所有消息中提取标签（格式：#标签#）
      const allMessages = dicePrivateMessageQueue.join(" ") + copywritingSuffix;
      const tagMatches = allMessages.match(/#([^#]+)#/g);
      let lastTag: string | null = null;
      if (tagMatches && tagMatches.length > 0) {
        // 取最后一个标签，去除 # 符号
        const lastMatch = tagMatches[tagMatches.length - 1];
        lastTag = lastMatch.replace(/#/g, "").trim();
      }

      // 根据标签选择头像
      let matchedAvatar: RoleAvatar | null = null;
      if (lastTag) {
        const matches = avatars.filter(a => (a.avatarTitle?.label || "") === lastTag);
        if (matches.length > 1) {
          const idx = Math.floor(Math.random() * matches.length);
          matchedAvatar = matches[idx] || null;
        }
        else {
          matchedAvatar = matches[0] || null;
        }
      }
      const fallbackDefaultLabelAvatar = avatars.find(a => (a.avatarTitle?.label || "") === "默认") || null;
      const chosenAvatarId = (matchedAvatar?.avatarId)
        ?? (fallbackDefaultLabelAvatar?.avatarId)
        ?? (avatars[0]?.avatarId ?? 0);

      const dicerMessageRequest: ChatMessageRequest = {
        roomId,
        messageType: 1,
        roleId: dicerRoleId,
        avatarId: chosenAvatarId,
        content: "",
        replayMessageId: optMsgRes.data?.messageId ?? undefined,
        extra: {},
      };
      for (const message of dicePrivateMessageQueue) {
        // 移除消息中的所有标签（格式：#标签#）
        const cleanMessage = message.replace(/#[^#]+#/g, "").trim();
        const cleanCopywriting = copywritingSuffix.replace(/#[^#]+#/g, "").trim();
        dicerMessageRequest.content = cleanMessage + (cleanCopywriting ? `\n${cleanCopywriting}` : "");
        await sendMessageMutation.mutateAsync(dicerMessageRequest);
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
