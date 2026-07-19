import { useGetMyUserInfoQuery, useUpdateUserInfoMutation } from "api/hooks/UserHooks";
import { useEffect, useMemo, useState } from "react";

import type { SecurityTab } from "@/components/profile/profileTab/components/AccountSecurityModal";

import {
  CHAT_STATUS_LABEL_MAX_LENGTH,
  DEFAULT_CHAT_STATUS_LABELS,
  normalizeChatStatusDescription,
  readChatStatusLabelsFromLocalStorage,
  writeChatStatusLabelsToLocalStorage,
} from "@/components/chat/chatStatusLabels";
import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { Switch, TextInput } from "@/components/common/FormField";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { AccountSecurityModal } from "@/components/profile/profileTab/components/AccountSecurityModal";
import {
  buildUserExtraWithNotificationSettings,
  readFeedbackDesktopEnabledFromLocalStorage,
  readFeedbackInAppEnabledFromLocalStorage,
  readGroupMessagePopupEnabledFromLocalStorage,
  readNotificationSettingsFromUserExtra,
  writeFeedbackDesktopEnabledToLocalStorage,
  writeFeedbackInAppEnabledToLocalStorage,
  writeGroupMessagePopupEnabledToLocalStorage,
} from "@/components/settings/notificationPreferences";

import type { ChatStatusType } from "../../../api/wsModels";

export default function SettingsPage() {
  const currentUserId = useGlobalUserId() ?? -1;
  const isLoggedIn = currentUserId > 0;

  const userInfoQuery = useGetMyUserInfoQuery(isLoggedIn);
  const updateUserInfoMutation = useUpdateUserInfoMutation();

  const localDefaultGroupPopupEnabled = useMemo(() => readGroupMessagePopupEnabledFromLocalStorage(), []);
  const localDefaultFeedbackInAppEnabled = useMemo(() => readFeedbackInAppEnabledFromLocalStorage(), []);
  const localDefaultFeedbackDesktopEnabled = useMemo(() => readFeedbackDesktopEnabledFromLocalStorage(), []);
  const [groupMessagePopupEnabled, setGroupMessagePopupEnabled] = useState(localDefaultGroupPopupEnabled);
  const [feedbackInAppEnabled, setFeedbackInAppEnabled] = useState(localDefaultFeedbackInAppEnabled);
  const [feedbackDesktopEnabled, setFeedbackDesktopEnabled] = useState(localDefaultFeedbackDesktopEnabled);
  const [chatStatusLabels, setChatStatusLabels] = useState(() => readChatStatusLabelsFromLocalStorage());
  const [initializedFromServer, setInitializedFromServer] = useState(false);
  const [accountSecurityState, setAccountSecurityState] = useState<{
    isOpen: boolean;
    tab: SecurityTab;
  }>({
    isOpen: false,
    tab: "password",
  });

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }
    if (initializedFromServer) {
      return;
    }

    const userInfo = userInfoQuery.data?.data;
    if (!userInfo) {
      return;
    }

    const settingsFromServer = readNotificationSettingsFromUserExtra(userInfo.extra);
    queueMicrotask(() => setGroupMessagePopupEnabled(settingsFromServer.groupMessagePopupEnabled));
    queueMicrotask(() => setFeedbackInAppEnabled(settingsFromServer.feedbackInAppEnabled));
    queueMicrotask(() => setFeedbackDesktopEnabled(settingsFromServer.feedbackDesktopEnabled));
    writeGroupMessagePopupEnabledToLocalStorage(settingsFromServer.groupMessagePopupEnabled);
    writeFeedbackInAppEnabledToLocalStorage(settingsFromServer.feedbackInAppEnabled);
    writeFeedbackDesktopEnabledToLocalStorage(settingsFromServer.feedbackDesktopEnabled);
    queueMicrotask(() => setInitializedFromServer(true));
  }, [initializedFromServer, isLoggedIn, userInfoQuery.data]);

  const saveNotificationSettings = async (nextSettings: {
    groupMessagePopupEnabled: boolean;
    feedbackInAppEnabled: boolean;
    feedbackDesktopEnabled: boolean;
  }) => {
    setGroupMessagePopupEnabled(nextSettings.groupMessagePopupEnabled);
    setFeedbackInAppEnabled(nextSettings.feedbackInAppEnabled);
    setFeedbackDesktopEnabled(nextSettings.feedbackDesktopEnabled);
    writeGroupMessagePopupEnabledToLocalStorage(nextSettings.groupMessagePopupEnabled);
    writeFeedbackInAppEnabledToLocalStorage(nextSettings.feedbackInAppEnabled);
    writeFeedbackDesktopEnabledToLocalStorage(nextSettings.feedbackDesktopEnabled);

    if (!isLoggedIn) {
      return;
    }

    const userInfo = userInfoQuery.data?.data;
    if (!userInfo) {
      appToast.warning({
        title: "通知设置暂未同步",
        description: "账号信息还在加载，当前选择只保存在这台设备。",
        details: "账号信息加载完成后，再切换一次该选项即可同步。",
      });
      return;
    }

    try {
      await updateUserInfoMutation.mutateAsync({
        userId: userInfo.userId,
        extra: buildUserExtraWithNotificationSettings(userInfo.extra, nextSettings),
      });
    }
    catch {
      appToast.error({
        title: "通知设置未同步",
        description: "当前选择已保存在这台设备，但没有同步到账号。",
        details: "请检查网络连接后，再切换一次该选项。",
      });
    }
  };

  const onGroupMessagePopupToggle = async (enabled: boolean) => {
    await saveNotificationSettings({
      groupMessagePopupEnabled: enabled,
      feedbackInAppEnabled,
      feedbackDesktopEnabled,
    });
  };

  const onFeedbackInAppToggle = async (enabled: boolean) => {
    await saveNotificationSettings({
      groupMessagePopupEnabled,
      feedbackInAppEnabled: enabled,
      feedbackDesktopEnabled,
    });
  };

  const onFeedbackDesktopToggle = async (enabled: boolean) => {
    await saveNotificationSettings({
      groupMessagePopupEnabled,
      feedbackInAppEnabled,
      feedbackDesktopEnabled: enabled,
    });
  };

  const openAccountSecurity = (tab: SecurityTab) => {
    if (!isLoggedIn) {
      appToast.error("请先登录后再进行账号安全设置");
      return;
    }
    setAccountSecurityState({
      isOpen: true,
      tab,
    });
  };

  const closeAccountSecurity = () => {
    setAccountSecurityState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const updateChatStatusLabel = (status: ChatStatusType, value: string) => {
    const nextLabel = normalizeChatStatusDescription(status, value);
    setChatStatusLabels((prev) => {
      const next = { ...prev, [status]: nextLabel };
      writeChatStatusLabelsToLocalStorage(next);
      return next;
    });
  };

  const resetChatStatusLabels = () => {
    setChatStatusLabels(DEFAULT_CHAT_STATUS_LABELS);
    writeChatStatusLabelsToLocalStorage(DEFAULT_CHAT_STATUS_LABELS);
    appToast.success("聊天状态文案已恢复默认");
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-6 py-5">
          <h1 className="text-xl font-semibold">设置中心</h1>
          <p className="mt-1 text-sm opacity-70">管理你的消息提醒偏好。</p>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-lg font-medium">消息通知</h2>
          <label
            className="
              mt-4 flex cursor-pointer items-center justify-between gap-4
              rounded-xl border border-base-300 px-4 py-3
            "
            aria-label="其他群聊新消息弹窗"
          >
            <div className="min-w-0">
              <div className="font-medium">其他群聊新消息弹窗</div>
              <div className="mt-1 text-sm opacity-70">开启后，当前未打开的其他群聊来消息时会弹出提示，点击可跳转。</div>
            </div>
            <Switch
              checked={groupMessagePopupEnabled}
              disabled={updateUserInfoMutation.isPending}
              onChange={e => void onGroupMessagePopupToggle(e.target.checked)}
            />
          </label>

          <label
            className="
              mt-3 flex cursor-pointer items-center justify-between gap-4
              rounded-xl border border-base-300 px-4 py-3
            "
            aria-label="反馈站内提醒"
          >
            <div className="min-w-0">
              <div className="font-medium">反馈站内提醒</div>
              <div className="mt-1 text-sm opacity-70">开启后，收到反馈通知时会在页面内弹出提醒卡片。</div>
            </div>
            <Switch
              checked={feedbackInAppEnabled}
              disabled={updateUserInfoMutation.isPending}
              onChange={e => void onFeedbackInAppToggle(e.target.checked)}
            />
          </label>

          <label
            className="
              mt-3 flex cursor-pointer items-center justify-between gap-4
              rounded-xl border border-base-300 px-4 py-3
            "
            aria-label="反馈桌面通知"
          >
            <div className="min-w-0">
              <div className="font-medium">反馈桌面通知</div>
              <div className="mt-1 text-sm opacity-70">开启后，后台页签收到反馈通知时会尝试弹系统桌面通知。</div>
            </div>
            <Switch
              checked={feedbackDesktopEnabled}
              disabled={updateUserInfoMutation.isPending}
              onChange={e => void onFeedbackDesktopToggle(e.target.checked)}
            />
          </label>

          {!isLoggedIn
            ? <p className="mt-3 text-xs text-warning">未登录状态下仅保存到本地浏览器。</p>
            : null}
        </div>

        <div className="border-t border-base-300 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">聊天状态文案</h2>
              <p className="mt-1 text-sm opacity-70">仅修改本机显示文案，不改变聊天状态协议。</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetChatStatusLabels}>
              恢复默认
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(Object.keys(DEFAULT_CHAT_STATUS_LABELS) as ChatStatusType[]).map(status => (
              <label
                key={status}
                className="rounded-xl border border-base-300 px-4 py-3"
              >
                <span className="text-xs font-medium uppercase tracking-wide opacity-55">{status}</span>
                <TextInput
                  density="compact"
                  type="text"
                  className="mt-2"
                  maxLength={CHAT_STATUS_LABEL_MAX_LENGTH}
                  value={chatStatusLabels[status]}
                  onChange={event => updateChatStatusLabel(status, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="border-t border-base-300 px-6 py-5">
          <h2 className="text-lg font-medium">账号安全</h2>
          <p className="mt-1 text-sm opacity-70">修改密码、绑定或换绑邮箱请在这里操作。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-info/45 text-info hover:border-info/70 hover:bg-info/10"
              onClick={() => openAccountSecurity("password")}
              disabled={!isLoggedIn}
            >
              修改密码
            </Button>
            <Button
              variant="outline"
              className="border-info/45 text-info hover:border-info/70 hover:bg-info/10"
              onClick={() => openAccountSecurity("email")}
              disabled={!isLoggedIn}
            >
              绑定/换绑邮箱
            </Button>
          </div>
          {!isLoggedIn
            ? <p className="mt-3 text-xs text-warning">请先登录后再修改账号安全信息。</p>
            : null}
        </div>
      </div>

      <AccountSecurityModal
        isOpen={accountSecurityState.isOpen}
        initialTab={accountSecurityState.tab}
        onClose={closeAccountSecurity}
      />
    </div>
  );
}
