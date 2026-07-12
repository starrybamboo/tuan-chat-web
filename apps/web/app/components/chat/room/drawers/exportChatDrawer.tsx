import { ExportIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchClientMetadataBatchWithCache } from "@tuanchat/query/metadata";
import { use, useMemo, useState } from "react";

import type { ExportOptions } from "@/utils/exportChatMessages";

import { RoomContext } from "@/components/chat/core/roomContext";
import { compareChatMessageResponsesByOrder } from "@/components/chat/shared/messageOrder";
import { filterVisibleChatMessages } from "@/components/chat/utils/hiddenDiceVisibility";
import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { Checkbox, ChoiceField, FieldLabel, Radio } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import { Divider } from "@/components/common/StatusPrimitives";
import { exportChatMessages } from "@/utils/exportChatMessages";

import type { ChatMessageResponse } from "../../../../../api";

import { fetchRoomInfoWithCache, fetchSpaceInfoWithCache } from "../../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../../api/instance";

/**
 * 聊天记录导出抽屉组件
 * 显示在房间右侧，提供导出当前聊天记录的功能
 */
type ExportChatDrawerProps = {
  messages?: ChatMessageResponse[];
  onClose?: () => void;
}

export default function ExportChatDrawer({ messages, onClose }: ExportChatDrawerProps) {
  const roomContext = use(RoomContext);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeTimestamp: true,
    includeUsername: true,
    dateFormat: "full",
  });

  // 获取历史消息
  const historyMessages = useMemo(() => {
    const base = filterVisibleChatMessages(messages ?? roomContext.chatHistory?.messages ?? [], {
      currentUserId: roomContext.curMember?.userId,
      memberType: roomContext.curMember?.memberType,
    });
    if (!messages) {
      return base;
    }
    return [...base].sort(compareChatMessageResponsesByOrder);
  }, [messages, roomContext.chatHistory?.messages, roomContext.curMember?.memberType, roomContext.curMember?.userId]);

  const roleMap = useMemo(() => {
    const map = new Map<number, string>();
    (roomContext.roomAllRoles ?? []).forEach((role) => {
      if (role?.roleId && role?.roleName) {
        map.set(role.roleId, role.roleName);
      }
    });
    return map;
  }, [roomContext.roomAllRoles]);

  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (historyMessages.length === 0) {
        appToast.error("没有消息可导出");
        return;
      }

      // 获取空间和房间的名称
      let spaceName = `空间${roomContext.spaceId}`;
      let roomName = `房间${roomContext.roomId}`;

      // 获取空间信息
      if (roomContext.spaceId) {
        const spaceInfo = await fetchSpaceInfoWithCache(queryClient, roomContext.spaceId);
        if (spaceInfo.data?.spaceId && spaceInfo.data?.name) {
          spaceName = spaceInfo.data.name;
        }
      }

      // 获取房间信息
      if (roomContext.roomId) {
        const roomInfo = await fetchRoomInfoWithCache(queryClient, roomContext.roomId);
        if (roomInfo.data?.roomId && roomInfo.data?.name) {
          roomName = roomInfo.data.name;
        }
      }

      // 生成完整的文件名：空间名_房间名
      const fileName = `${spaceName}_${roomName}`;

      // 构建角色映射 - 从缓存或API中获取所有出现的角色信息
      const allRoleMap = new Map<number, string>(roleMap);
      const roleIds = new Set<number>();
      historyMessages.forEach((msg) => {
        const roleId = msg.message.roleId;
        if (typeof roleId === "number" && roleId > 0) {
          roleIds.add(roleId);
        }
      });

      const missingRoleIds = [...roleIds].filter(roleId => roleId > 0 && !allRoleMap.has(roleId));

      const userMap = new Map<number, string>();
      roomContext.roomMembers.forEach((member) => {
        if (member.userId && member.username) {
          userMap.set(member.userId, member.username);
        }
      });
      const userIds = new Set<number>();
      historyMessages.forEach((msg) => {
        userIds.add(msg.message.userId);
      });

      const missingUserIds = [...userIds].filter(userId => userId > 0 && !userMap.has(userId));
      const metadata = await fetchClientMetadataBatchWithCache(queryClient, tuanchat, {
        roleIds: missingRoleIds,
        userIds: missingUserIds,
      });
      Object.values(metadata.roles ?? {}).forEach((role) => {
        if (role.roleId && role.roleName) {
          allRoleMap.set(role.roleId, role.roleName);
        }
      });
      Object.values(metadata.users ?? {}).forEach((user) => {
        if (user.userId && user.username) {
          userMap.set(user.userId, user.username);
        }
      });

      exportChatMessages(historyMessages, allRoleMap, userMap, fileName, exportOptions);
      appToast.success("导出成功!");
      onClose?.();
    }
    catch (error) {
      console.error("导出失败:", error);
      appToast.error("导出失败,请重试");
    }
    finally {
      setIsExporting(false);
    }
  };

  const toggleOption = (option: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: typeof prev[option] === "boolean" ? !prev[option] : prev[option],
    }));
  };

  const setDateFormat = (format: "full" | "short") => {
    setExportOptions(prev => ({
      ...prev,
      dateFormat: format,
    }));
  };

  return (
    <div className="flex flex-col h-full p-4 gap-2">
      <div className="flex items-center justify-between py-2">
        <h3 className="font-semibold">
          <ExportIcon className="size-5 inline mr-2" />
          导出聊天记录-
          {historyMessages.length}
        </h3>
        {onClose && (
          <IconButton
            variant="ghost"
            size="sm"
            shape="circle"
            onClick={onClose}
            label="关闭导出抽屉"
            icon={<span aria-hidden="true">✕</span>}
          />
        )}
      </div>

      <Divider className="my-0" />

      {/* 导出选项 */}
      <div className="flex flex-col gap-3">
        <h4 className="text-base font-medium">导出选项</h4>

        {/* 时间戳选项 */}
        <ChoiceField id="export-include-timestamp" label="包含时间戳">
          {controlProps => (
            <Checkbox
              {...controlProps}
              density="compact"
              checked={exportOptions.includeTimestamp}
              onChange={() => toggleOption("includeTimestamp")}
            />
          )}
        </ChoiceField>

        {/* 用户名选项 */}
        <ChoiceField id="export-include-username" label="包含用户名">
          {controlProps => (
            <Checkbox
              {...controlProps}
              density="compact"
              checked={exportOptions.includeUsername}
              onChange={() => toggleOption("includeUsername")}
            />
          )}
        </ChoiceField>

        {/* 日期格式选项 */}
        {exportOptions.includeTimestamp && (
          <div className="flex flex-col gap-2">
            <FieldLabel>日期格式</FieldLabel>
            <div className="flex flex-col gap-2 pl-4">
              <ChoiceField id="export-date-format-full" label="完整(日期+时间)">
                {controlProps => (
                  <Radio
                    {...controlProps}
                    density="compact"
                    name="dateFormat"
                    checked={exportOptions.dateFormat === "full"}
                    onChange={() => setDateFormat("full")}
                  />
                )}
              </ChoiceField>
              <ChoiceField id="export-date-format-short" label="简短(仅时间)">
                {controlProps => (
                  <Radio
                    {...controlProps}
                    density="compact"
                    name="dateFormat"
                    checked={exportOptions.dateFormat === "short"}
                    onChange={() => setDateFormat("short")}
                  />
                )}
              </ChoiceField>
            </div>
          </div>
        )}
      </div>

      <Divider className="my-2" />

      {/* 导出按钮 */}
      <Button
        variant="primary"
        onClick={handleExport}
        loading={isExporting}
        disabled={isExporting || historyMessages.length === 0}
      >
        {isExporting ? "导出中..." : "导出为 TXT 文件"}
      </Button>

      {/* 说明文字 */}
      <div className="text-xs opacity-60 mt-auto">
        <p>导出的文件将包含当前房间的所有聊天记录</p>
        <p className="mt-1">格式：纯文本(.txt)</p>
      </div>
    </div>
  );
}
