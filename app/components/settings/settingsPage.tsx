import type { SecurityTab } from "@/components/profile/profileTab/components/AccountSecurityModal";
import { useGetMyUserInfoQuery, useUpdateUserInfoMutation } from "api/hooks/UserHooks";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useGlobalContext } from "@/components/globalContextProvider";
import { AccountSecurityModal } from "@/components/profile/profileTab/components/AccountSecurityModal";
import {
  buildUserExtraWithNotificationSettings,
  readGroupMessagePopupEnabledFromLocalStorage,
  readNotificationSettingsFromUserExtra,
  writeGroupMessagePopupEnabledToLocalStorage,
} from "@/components/settings/notificationPreferences";

export default function SettingsPage() {
  const globalContext = useGlobalContext();
  const currentUserId = globalContext.userId ?? -1;
  const isLoggedIn = currentUserId > 0;

  const userInfoQuery = useGetMyUserInfoQuery(isLoggedIn);
  const updateUserInfoMutation = useUpdateUserInfoMutation();

  const localDefaultGroupPopupEnabled = useMemo(() => readGroupMessagePopupEnabledFromLocalStorage(), []);
  const [groupMessagePopupEnabled, setGroupMessagePopupEnabled] = useState(localDefaultGroupPopupEnabled);
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
    setGroupMessagePopupEnabled(settingsFromServer.groupMessagePopupEnabled);
    writeGroupMessagePopupEnabledToLocalStorage(settingsFromServer.groupMessagePopupEnabled);
    setInitializedFromServer(true);
  }, [initializedFromServer, isLoggedIn, userInfoQuery.data]);

  const onGroupMessagePopupToggle = async (enabled: boolean) => {
    setGroupMessagePopupEnabled(enabled);
    writeGroupMessagePopupEnabledToLocalStorage(enabled);

    if (!isLoggedIn) {
      toast("设置已保存在当前设备");
      return;
    }

    const userInfo = userInfoQuery.data?.data;
    if (!userInfo) {
      return;
    }

    try {
      await updateUserInfoMutation.mutateAsync({
        userId: userInfo.userId,
        extra: buildUserExtraWithNotificationSettings(userInfo.extra, { groupMessagePopupEnabled: enabled }),
      });
      toast.success("通知设置已保存");
    }
    catch {
      toast.error("通知设置保存失败，已保留本地设置");
    }
  };

  const openAccountSecurity = (tab: SecurityTab) => {
    if (!isLoggedIn) {
      toast.error("请先登录后再进行账号安全设置");
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

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-6 py-5">
          <h1 className="text-xl font-semibold">设置中心</h1>
          <p className="mt-1 text-sm opacity-70">管理你的消息提醒偏好。</p>
        </div>

        <div className="px-6 py-5">
          <h2 className="text-lg font-medium">消息通知</h2>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-base-300 px-4 py-3">
            <div className="min-w-0">
              <div className="font-medium">其他群聊新消息弹窗</div>
              <div className="mt-1 text-sm opacity-70">开启后，当前未打开的其他群聊来消息时会弹出提示，点击可跳转。</div>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={groupMessagePopupEnabled}
              disabled={updateUserInfoMutation.isPending}
              onChange={e => void onGroupMessagePopupToggle(e.target.checked)}
            />
          </label>

          {!isLoggedIn
            ? <p className="mt-3 text-xs text-warning">未登录状态下仅保存到本地浏览器。</p>
            : null}
        </div>

        <div className="border-t border-base-300 px-6 py-5">
          <h2 className="text-lg font-medium">账号安全</h2>
          <p className="mt-1 text-sm opacity-70">修改密码、绑定或换绑邮箱请在这里操作。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-outline btn-primary"
              onClick={() => openAccountSecurity("password")}
              disabled={!isLoggedIn}
            >
              修改密码
            </button>
            <button
              type="button"
              className="btn btn-outline btn-primary"
              onClick={() => openAccountSecurity("email")}
              disabled={!isLoggedIn}
            >
              绑定/换绑邮箱
            </button>
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
