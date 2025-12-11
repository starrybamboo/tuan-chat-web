import type { ExportOptions } from "@/utils/exportChatMessages";
import { RoomContext } from "@/components/chat/roomContext";
import { exportChatMessages } from "@/utils/exportChatMessages";
import { useQueryClient } from "@tanstack/react-query";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { tuanchat } from "../../../../api/instance";
import { useGetRolesQueries } from "../../../../api/queryHooks";

/**
 * 聊天记录导出抽屉组件
 * 显示在房间右侧，提供导出当前聊天记录的功能
 */
export default function ExportChatDrawer() {
  const roomContext = use(RoomContext);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeTimestamp: true,
    includeUsername: true,
    dateFormat: "full",
  });

  // 获取历史消息
  const historyMessages = useMemo(() => roomContext.chatHistory?.messages ?? [], [roomContext.chatHistory?.messages]);

  // 获取所有角色信息用于导出
  const getRolesQueries = useGetRolesQueries(
    roomContext.roomRolesThatUserOwn.map(role => role.roleId),
  );

  // 构建角色映射
  const roleMap = useMemo(() => {
    const map = new Map<number, string>();
    getRolesQueries.forEach((query: any) => {
      const role = query.data?.data;
      if (role?.roleId && role?.roleName) {
        map.set(role.roleId, role.roleName);
      }
    });
    return map;
  }, [getRolesQueries]);

  const queryClient = useQueryClient();

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (historyMessages.length === 0) {
        toast.error("没有消息可导出");
        return;
      }

      // 获取空间和房间的名称
      let spaceName = `空间${roomContext.spaceId}`;
      let roomName = `房间${roomContext.roomId}`;

      // 获取空间信息
      if (roomContext.spaceId) {
        const spaceInfo = await queryClient.fetchQuery({
          queryKey: ["getSpaceInfo", roomContext.spaceId],
          queryFn: () => tuanchat.spaceController.getSpaceInfo(roomContext.spaceId ?? 0),
          staleTime: 5 * 60 * 1000, // 5分钟缓存
        });
        if (spaceInfo.data?.spaceId && spaceInfo.data?.name) {
          spaceName = spaceInfo.data.name;
        }
      }

      // 获取房间信息
      if (roomContext.roomId) {
        const roomInfo = await queryClient.fetchQuery({
          queryKey: ["getRoomInfo", roomContext.roomId],
          queryFn: () => tuanchat.roomController.getRoomInfo(roomContext.roomId ?? 0),
          staleTime: 5 * 60 * 1000, // 5分钟缓存
        });
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
        if (msg.message.roleId > 0) {
          roleIds.add(msg.message.roleId);
        }
      });

      // 获取所有角色的信息
      for (const roleId of roleIds) {
        if (roleId <= 0 || allRoleMap.has(roleId)) {
          continue;
        }
        const roleInfo = await queryClient.fetchQuery({
          queryKey: ["getRole", roleId],
          queryFn: () => tuanchat.roleController.getRole(roleId),
          staleTime: 5 * 60 * 1000, // 5分钟缓存
        });
        if (roleInfo.data?.roleId && roleInfo.data?.roleName) {
          allRoleMap.set(roleInfo.data.roleId, roleInfo.data.roleName);
        }
      }

      // 构建用户映射 - 从缓存或API中获取用户信息
      const userMap = new Map<number, string>();
      const userIds = new Set<number>();
      historyMessages.forEach((msg) => {
        userIds.add(msg.message.userId);
      });

      // 获取所有用户的信息
      for (const userId of userIds) {
        const userInfo = await queryClient.fetchQuery({
          queryKey: ["getUserInfo", userId],
          queryFn: () => tuanchat.userController.getUserInfo(userId),
          staleTime: 5 * 60 * 1000, // 5分钟缓存
        });
        if (userInfo.data?.userId && userInfo.data?.username) {
          userMap.set(userInfo.data.userId, userInfo.data.username);
        }
      }

      exportChatMessages(historyMessages, allRoleMap, userMap, fileName, exportOptions);
      toast.success("导出成功!");
    }
    catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败,请重试");
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
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">导出聊天记录</h3>
        <p className="text-sm opacity-70">
          当前共有
          {" "}
          {historyMessages.length}
          {" "}
          条消息
        </p>
      </div>

      <div className="divider my-2"></div>

      {/* 导出选项 */}
      <div className="flex flex-col gap-3">
        <h4 className="text-base font-medium">导出选项</h4>

        {/* 时间戳选项 */}
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={exportOptions.includeTimestamp}
            onChange={() => toggleOption("includeTimestamp")}
          />
          <span className="label-text">包含时间戳</span>
        </label>

        {/* 用户名选项 */}
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={exportOptions.includeUsername}
            onChange={() => toggleOption("includeUsername")}
          />
          <span className="label-text">包含用户名</span>
        </label>

        {/* 日期格式选项 */}
        {exportOptions.includeTimestamp && (
          <div className="flex flex-col gap-2">
            <span className="label-text font-medium">日期格式</span>
            <div className="flex flex-col gap-2 pl-4">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="dateFormat"
                  className="radio radio-sm"
                  checked={exportOptions.dateFormat === "full"}
                  onChange={() => setDateFormat("full")}
                />
                <span className="label-text">完整(日期+时间)</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="radio"
                  name="dateFormat"
                  className="radio radio-sm"
                  checked={exportOptions.dateFormat === "short"}
                  onChange={() => setDateFormat("short")}
                />
                <span className="label-text">简短(仅时间)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="divider my-2"></div>

      {/* 导出按钮 */}
      <button
        type="button"
        className={`btn btn-primary ${isExporting ? "btn-disabled" : ""}`}
        onClick={handleExport}
        disabled={isExporting || historyMessages.length === 0}
      >
        {isExporting
          ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                导出中...
              </>
            )
          : (
              "导出为 TXT 文件"
            )}
      </button>

      {/* 说明文字 */}
      <div className="text-xs opacity-60 mt-auto">
        <p>导出的文件将包含当前房间的所有聊天记录</p>
        <p className="mt-1">格式：纯文本(.txt)</p>
      </div>
    </div>
  );
}
