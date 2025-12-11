import type { ExportOptions } from "@/utils/exportChatMessages";
import { RoomContext } from "@/components/chat/roomContext";
import { exportChatMessages } from "@/utils/exportChatMessages";
import { useQueryClient } from "@tanstack/react-query";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { tuanchat } from "../../../../api/instance";
import { useGetRolesQueries } from "../../../../api/queryHooks";

/**
 * 聊天记录导出按钮组件
 * 提供导出当前聊天记录的功能，支持自定义导出选项
 */
export default function ExportChatButton() {
  const roomContext = use(RoomContext);
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

      exportChatMessages(
        historyMessages,
        allRoleMap,
        userMap,
        fileName,
        exportOptions,
      );

      toast.success(`已导出 ${historyMessages.length} 条消息`);
      setShowOptions(false);
    }
    catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败，请重试");
    }
    finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      {/* 主按钮 */}
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting || historyMessages.length === 0}
        className="btn btn-sm btn-ghost gap-2"
        title="导出聊天记录"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        导出记录
      </button>

      {/* 下拉菜单 */}
      {showOptions && (
        <div className="absolute top-full right-0 mt-2 bg-base-100 border border-base-300 rounded-lg shadow-lg p-4 w-64 z-50">
          <div className="space-y-3">
            <h3 className="font-semibold text-base-content">导出选项</h3>

            {/* 时间戳选项 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeTimestamp}
                onChange={(e) => {
                  setExportOptions({
                    ...exportOptions,
                    includeTimestamp: e.target.checked,
                  });
                }}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">包含时间戳</span>
            </label>

            {/* 用户名选项 */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeUsername}
                onChange={(e) => {
                  setExportOptions({
                    ...exportOptions,
                    includeUsername: e.target.checked,
                  });
                }}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">包含用户名</span>
            </label>

            {/* 日期格式选项 */}
            <div className="flex items-center gap-2">
              <span className="text-sm">日期格式：</span>
              <select
                value={exportOptions.dateFormat}
                onChange={(e) => {
                  setExportOptions({
                    ...exportOptions,
                    dateFormat: e.target.value as "full" | "short",
                  });
                }}
                className="select select-sm select-bordered flex-1"
              >
                <option value="full">完整 (YYYY/MM/DD)</option>
                <option value="short">简短 (HH:mm:ss)</option>
              </select>
            </div>

            {/* 消息统计 */}
            <div className="text-xs text-base-content/60 pt-2 border-t border-base-200">
              {`将导出 ${historyMessages.length} 条消息`}
            </div>

            {/* 导出按钮 */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="btn btn-sm btn-primary w-full"
            >
              {isExporting
                ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      导出中...
                    </>
                  )
                : (
                    "确认导出"
                  )}
            </button>

            {/* 取消按钮 */}
            <button
              type="button"
              onClick={() => setShowOptions(false)}
              disabled={isExporting}
              className="btn btn-sm btn-ghost w-full"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
