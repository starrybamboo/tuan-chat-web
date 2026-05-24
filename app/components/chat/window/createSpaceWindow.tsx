import type { ReactNode } from "react";
import { useCreateSpaceMutation, useSetSpaceExtraMutation } from "api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "api/hooks/RoleAndAvatarHooks";
import { useGetRulePageInfiniteQuery } from "api/hooks/ruleQueryHooks";
import { useGetUserInfoQuery } from "api/hooks/UserHooks";
import { useEffect, useId, useMemo, useState } from "react";
import toast from "react-hot-toast";
import checkBack from "@/components/common/autoContrastText";
import { useResolvedRoleAvatarUrl } from "@/components/common/roleAccess.shared";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCropper";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { DiceFiveIcon, PlusIcon, WebgalIcon } from "@/icons";
import DiceMaidenLinkModal from "@/components/Role/DiceMaidenLinkModal";
import { imageLowUrl } from "@/utils/mediaUrl";

interface CreateSpaceWindowProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

interface WebgalInitialSettings {
  autoFigureEnabled: boolean;
  coverFromRoomAvatarEnabled: boolean;
  startupLogoFromRoomAvatarEnabled: boolean;
  gameIconFromRoomAvatarEnabled: boolean;
  gameNameFromRoomNameEnabled: boolean;
}

const DEFAULT_WEBGAL_INITIAL_SETTINGS: WebgalInitialSettings = {
  autoFigureEnabled: false,
  coverFromRoomAvatarEnabled: true,
  startupLogoFromRoomAvatarEnabled: false,
  gameIconFromRoomAvatarEnabled: true,
  gameNameFromRoomNameEnabled: true,
};

const WEBGAL_SETTING_OPTIONS: Array<{
  key: keyof WebgalInitialSettings;
  label: string;
  description: string;
}> = [
  {
    key: "coverFromRoomAvatarEnabled",
    label: "标题图沿用房间头像",
    description: "封面与房间头像保持一致",
  },
  {
    key: "gameIconFromRoomAvatarEnabled",
    label: "游戏图标沿用房间头像",
    description: "导出时图标与房间统一",
  },
  {
    key: "gameNameFromRoomNameEnabled",
    label: "游戏名跟随房间名",
    description: "改名后自动同步",
  },
  {
    key: "startupLogoFromRoomAvatarEnabled",
    label: "启动图沿用房间头像",
    description: "复用为启动 Logo",
  },
  {
    key: "autoFigureEnabled",
    label: "自动填充立绘",
    description: "从角色素材中补齐",
  },
];

export default function CreateSpaceWindow({ onCancel, onSuccess }: CreateSpaceWindowProps) {
  const userId = useGlobalUserId();
  const getUserInfo = useGetUserInfoQuery(Number(userId));
  const userInfo = getUserInfo.data?.data;
  const spaceAvatarThumbUploadId = useId().replace(/:/g, "");
  const spaceNameInputId = useId().replace(/:/g, "");
  const defaultSpaceAvatarFileId = userInfo?.avatarFileId;
  const defaultSpaceAvatar = imageLowUrl(defaultSpaceAvatarFileId);
  const defaultSpaceName = userInfo?.username ? `${String(userInfo.username)}的空间` : "";

  const createSpaceMutation = useCreateSpaceMutation();
  const setSpaceExtraMutation = useSetSpaceExtraMutation();

  const [spaceAvatarThumbDraft, setSpaceAvatarThumbDraft] = useState<string | null>(null);
  const [spaceAvatarFileIdDraft, setSpaceAvatarFileIdDraft] = useState<number | undefined>();
  const [spaceNameDraft, setSpaceNameDraft] = useState<string | null>(null);
  const spaceAvatarThumb = spaceAvatarThumbDraft ?? defaultSpaceAvatar;
  const spaceName = spaceNameDraft ?? defaultSpaceName;

  const [selectedRuleId, setSelectedRuleId] = useState<number>(1);
  const [dicerRoleId, setDicerRoleId] = useState<number | undefined>(undefined);
  const [isDiceMaidenLinkModalOpen, setIsDiceMaidenLinkModalOpen] = useState(false);
  const [webgalInitialSettings, setWebgalInitialSettings] = useState<WebgalInitialSettings>(DEFAULT_WEBGAL_INITIAL_SETTINGS);

  const { data: linkedDicerData } = useGetRoleQuery(dicerRoleId || 0);
  const linkedDicerRole = linkedDicerData?.data;
  const dicerAvatarUrl = useResolvedRoleAvatarUrl(linkedDicerRole, "/favicon.ico");
  const dicerRoleError = useMemo(() => {
    if (!dicerRoleId)
      return null;
    if (!linkedDicerRole)
      return null;
    if (linkedDicerRole.type !== 1)
      return "关联的角色不是骰娘类型";
    return null;
  }, [dicerRoleId, linkedDicerRole]);
  const getRulesQuery = useGetRulePageInfiniteQuery({}, 100);
  const rules = getRulesQuery.data?.pages.flatMap(page => page.data?.list ?? []) ?? [];
  const selectedRuleName = rules.find(rule => rule.ruleId === selectedRuleId)?.ruleName;
  const isSubmitting = createSpaceMutation.isPending || setSpaceExtraMutation.isPending;
  const canSubmit = spaceName.trim().length > 0 && !isSubmitting;

  const [spaceAvatarThumbTextColor, setSpaceAvatarThumbTextColor] = useState("text-black");

  useEffect(() => {
    if (spaceAvatarThumb) {
      checkBack(spaceAvatarThumb).then(() => {
        const computedColor = getComputedStyle(document.documentElement)
          .getPropertyValue("--text-color")
          .trim();
        setSpaceAvatarThumbTextColor(computedColor === "white" ? "text-white" : "text-black");
      });
    }
  }, [spaceAvatarThumb]);

  useEffect(() => {
    if (rules.length === 0) {
      return;
    }
    if (rules.some(rule => rule.ruleId === selectedRuleId)) {
      return;
    }
    const firstRuleId = Number(rules[0]?.ruleId);
    if (Number.isFinite(firstRuleId) && firstRuleId > 0) {
      setSelectedRuleId(firstRuleId);
    }
  }, [rules, selectedRuleId]);

  function updateWebgalInitialSetting(key: keyof WebgalInitialSettings, value: boolean) {
    setWebgalInitialSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  async function createSpace() {
    if (!canSubmit) {
      return;
    }

    try {
      const result = await createSpaceMutation.mutateAsync({
        userIdList: [],
        avatarFileId: spaceAvatarFileIdDraft ?? defaultSpaceAvatarFileId,
        spaceName,
        ruleId: selectedRuleId,
      });

      const newSpaceId = result?.data?.spaceId;
      if (typeof newSpaceId === "number" && Number.isFinite(newSpaceId) && newSpaceId > 0) {
        try {
          await setSpaceExtraMutation.mutateAsync({
            spaceId: newSpaceId,
            key: "webgalRealtimeRenderSettings",
            value: JSON.stringify(webgalInitialSettings),
          });
        }
        catch {
          toast.error("空间已创建，WebGAL 设置稍后可在面板调整");
        }
      }

      onSuccess?.();
    }
    catch {
      toast.error("创建空间失败");
    }
  }

  const enabledWebgalCount = Object.values(webgalInitialSettings).filter(Boolean).length;

  return (
    <div className="flex max-h-[min(86vh,820px)] w-[min(960px,calc(100vw-2rem))] flex-col overflow-hidden bg-base-100 text-base-content lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex shrink-0 flex-col border-b border-base-300/70 bg-base-200/40 p-6 lg:min-h-0 lg:border-b-0 lg:border-r lg:p-7">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold leading-tight">创建空间</h2>
        </div>

        <div className="mt-7 flex flex-col items-center">
          <ImgUploaderWithCopper
            setCopperedDownloadUrl={(url) => {
              setSpaceAvatarThumbDraft(url);
            }}
            mutate={(payload) => {
              if (typeof payload?.avatarFileId === "number") {
                setSpaceAvatarFileIdDraft(payload.avatarFileId);
              }
            }}
            fileName={`new-space-avatar-${spaceAvatarThumbUploadId}`}
            aspect={1}
            copperedCompressionPreset="avatarThumb"
          >
            <div className="group relative size-28 overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-sm">
              <img
                src={spaceAvatarThumb}
                alt="space avatar"
                className="size-full object-cover transition duration-200 group-hover:scale-105 group-hover:brightness-75"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-base-100/10 opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100">
                <span className={`${spaceAvatarThumbTextColor} rounded bg-base-100/70 px-2 py-1 text-xs font-semibold`}>
                  更换头像
                </span>
              </div>
            </div>
          </ImgUploaderWithCopper>
        </div>

        <div className="mt-6">
          <label htmlFor={spaceNameInputId} className="mb-2 block text-sm font-medium text-base-content/75">
            空间名称
          </label>
          <input
            id={spaceNameInputId}
            type="text"
            value={spaceName}
            placeholder={defaultSpaceName}
            maxLength={32}
            className="input input-bordered w-full bg-base-100 text-base"
            onChange={(e) => {
              const inputValue = e.target.value;
              setSpaceNameDraft(inputValue === "" ? null : inputValue);
            }}
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-base-content/45">
            <span>之后可在空间设置中修改</span>
            <span>{spaceName.length}/32</span>
          </div>
        </div>

        <footer className="mt-auto flex flex-col gap-2 pt-7 sm:flex-row lg:flex-col">
          <button
            type="button"
            className="btn btn-primary order-1 min-w-36 sm:flex-1 sm:order-2 lg:flex-none lg:order-1"
            disabled={!canSubmit}
            onClick={() => {
              void createSpace();
            }}
          >
            {isSubmitting && <span className="loading loading-spinner loading-sm" />}
            <PlusIcon className="size-4" />
            创建空间
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost order-2 min-w-24 sm:flex-1 sm:order-1 lg:flex-none lg:order-2"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              取消
            </button>
          )}
        </footer>
      </aside>

      <main className="hidden-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto bg-base-100 p-6 lg:p-7">
        <div className="border-b border-base-300/60 pb-4">
          <h3 className="text-xl font-semibold leading-7">初始化</h3>
        </div>

        <SettingsSection
          icon={<DiceFiveIcon className="size-5" />}
          title="跑团设置"
          description="选择规则与空间骰娘"
        >
          <div className="space-y-2.5">
            <div className="dropdown dropdown-bottom w-full">
              <button
                type="button"
                className="group flex w-full items-center gap-3 rounded-xl border border-base-300/70 bg-base-100 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-base-200/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <DiceFiveIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] uppercase tracking-wide text-base-content/45">规则</span>
                  <span className="mt-0.5 block truncate text-sm font-medium">
                    {selectedRuleName ?? (getRulesQuery.isLoading ? "加载中..." : "未找到规则")}
                  </span>
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 shrink-0 text-base-content/45 transition group-hover:text-base-content/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <ul className="dropdown-content menu z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-base-300/70 bg-base-100 p-1.5 shadow-2xl">
                {rules.map((rule) => {
                  const isActive = rule.ruleId === selectedRuleId;
                  return (
                    <li key={rule.ruleId}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-base-200"
                        }`}
                        onClick={() => {
                          setSelectedRuleId(Number(rule.ruleId));
                          if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                          }
                        }}
                      >
                        <span className="truncate">{rule.ruleName}</span>
                        {isActive && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl border border-base-300/70 bg-base-100 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-base-200/40 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              onClick={() => setIsDiceMaidenLinkModalOpen(true)}
            >
              {dicerRoleId && !dicerRoleError && linkedDicerRole
                ? (
                    <span className="flex size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-base-300/70">
                      <img src={dicerAvatarUrl} alt={linkedDicerRole.roleName || "骰娘"} className="size-full object-cover" />
                    </span>
                  )
                : (
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="4" width="16" height="16" rx="2.5" />
                        <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
                      </svg>
                    </span>
                  )}
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] uppercase tracking-wide text-base-content/45">空间骰娘</span>
                <span className={`mt-0.5 block truncate text-sm font-medium ${dicerRoleError ? "text-error" : ""}`}>
                  {dicerRoleId
                    ? (dicerRoleError || linkedDicerRole?.roleName || `ID: ${dicerRoleId}`)
                    : "未选择，使用默认骰娘"}
                </span>
              </span>
              <span className="text-xs text-base-content/45 transition group-hover:text-base-content/70">
                {dicerRoleId ? "更改" : "选择"}
              </span>
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={<WebgalIcon className="size-5" />}
          title="WebGAL 联动"
          description="导出可视化作品时使用的默认偏好"
          accessory={(
            <span className="text-[11px] tabular-nums text-base-content/55">
              已开启
              {" "}
              {enabledWebgalCount}
              /
              {WEBGAL_SETTING_OPTIONS.length}
            </span>
          )}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {WEBGAL_SETTING_OPTIONS.map((option) => {
              const checked = webgalInitialSettings[option.key];
              return (
                <label
                  key={option.key}
                  className={`group relative flex cursor-pointer items-start justify-between gap-3 rounded-xl border px-3.5 py-3 transition ${
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-base-300/70 bg-base-100 hover:border-primary/30 hover:bg-base-200/35"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium leading-snug">{option.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-base-content/55">{option.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary toggle-sm shrink-0"
                    checked={checked}
                    onChange={event => updateWebgalInitialSetting(option.key, event.target.checked)}
                  />
                </label>
              );
            })}
          </div>
        </SettingsSection>
      </main>
    </div>
  );
}

function SettingsSection({
  accessory,
  children,
  description,
  icon,
  title,
}: {
  accessory?: ReactNode;
  children: ReactNode;
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-5">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-base-content/55">{description}</p>
        </div>
        {accessory && <div className="shrink-0">{accessory}</div>}
      </div>
      {children}
    </section>
  );
}
