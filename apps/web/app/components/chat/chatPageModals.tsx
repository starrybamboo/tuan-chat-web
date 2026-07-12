import type { ReactNode } from "react";

import { FileTextIcon, PlusIcon } from "@phosphor-icons/react";
import React from "react";

import { SpaceContext } from "@/components/chat/core/spaceContext";
import SpaceInvitePanel from "@/components/chat/space/spaceInvitePanel";
import { canInviteSpectators, canManageMemberPermissions } from "@/components/chat/utils/memberPermissions";
import AddMemberWindow from "@/components/chat/window/addMemberWindow";
import CreateRoomWindow from "@/components/chat/window/createRoomWindow";
import CreateSpaceWindow from "@/components/chat/window/createSpaceWindow";
import { Button } from "@/components/common/Button";
import { Radio, TextInput } from "@/components/common/FormField";
import { ToastWindow } from "@/components/common/toastWindow/ToastWindowComponent";
import { RoomChatIcon } from "@/icons";

type ChatPageModalsProps = {
  isSpaceHandleOpen: boolean;
  setIsSpaceHandleOpen: (isOpen: boolean) => void;

  isCreateInCategoryOpen: boolean;
  closeCreateInCategory: () => void;
  createInCategoryMode: "room" | "doc";
  setCreateInCategoryMode: (mode: "room" | "doc") => void;
  isKPInSpace: boolean;
  createDocTitle: string;
  setCreateDocTitle: (title: string) => void;
  pendingCreateInCategoryId: string | null;
  createDocInSelectedCategory: (titleOverride?: string) => void;
  activeSpaceId: number | null;
  activeSpaceAvatar?: string;
  onRoomCreated: (roomId?: number) => void;

  inviteRoomId: number | null;
  setInviteRoomId: (roomId: number | null) => void;
  onAddRoomMember: (userId: number) => void;

  isMemberHandleOpen: boolean;
  setIsMemberHandleOpen: (isOpen: boolean) => void;
  onAddSpaceMember: (userId: number) => void;
  onAddSpacePlayer: (userId: number) => void;
}

export default function ChatPageModals({
  isSpaceHandleOpen,
  setIsSpaceHandleOpen,
  isCreateInCategoryOpen,
  closeCreateInCategory,
  createInCategoryMode,
  setCreateInCategoryMode,
  isKPInSpace,
  createDocTitle,
  setCreateDocTitle,
  pendingCreateInCategoryId,
  createDocInSelectedCategory,
  activeSpaceId,
  activeSpaceAvatar,
  onRoomCreated,
  inviteRoomId,
  setInviteRoomId,
  onAddRoomMember,
  isMemberHandleOpen,
  setIsMemberHandleOpen,
  onAddSpaceMember,
  onAddSpacePlayer,
}: ChatPageModalsProps) {
  const spaceContext = React.use(SpaceContext);
  const canInvitePlayers = canManageMemberPermissions(spaceContext.memberType);
  const canInviteMembers = canInviteSpectators(spaceContext.memberType);
  const docTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const draftDocTitleRef = React.useRef(createDocTitle);
  const wasCreateInCategoryOpenRef = React.useRef(false);
  const [isCreateRoomSubmitting, setIsCreateRoomSubmitting] = React.useState(false);

  React.useEffect(() => {
    const wasOpen = wasCreateInCategoryOpenRef.current;
    wasCreateInCategoryOpenRef.current = isCreateInCategoryOpen;
    if (isCreateInCategoryOpen && !wasOpen) {
      draftDocTitleRef.current = createDocTitle;
      if (docTitleInputRef.current) {
        docTitleInputRef.current.value = createDocTitle;
      }
    }
    if (!isCreateInCategoryOpen) {
      setIsCreateRoomSubmitting(false);
    }
  }, [createDocTitle, isCreateInCategoryOpen]);

  return (
    <>

      <ToastWindow
        isOpen={isSpaceHandleOpen}
        onClose={() => setIsSpaceHandleOpen(false)}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <CreateSpaceWindow
          onCancel={() => setIsSpaceHandleOpen(false)}
          onSuccess={() => setIsSpaceHandleOpen(false)}
        />
      </ToastWindow>

      <ToastWindow
        isOpen={isCreateInCategoryOpen}
        onClose={() => {
          if (!isCreateRoomSubmitting) {
            closeCreateInCategory();
          }
        }}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <div className="
          flex max-h-[min(84vh,780px)] w-[min(980px,calc(100vw-2rem))] flex-col
          overflow-hidden bg-base-100 text-base-content
          lg:grid lg:grid-cols-[320px_minmax(0,1fr)]
        ">
          <aside className="
            flex shrink-0 flex-col border-b border-base-300/70 bg-base-200/40
            p-5 pr-14
            lg:min-h-0 lg:border-b-0 lg:border-r lg:p-6
          ">
            <div className="min-w-0">
              <h2 className="text-2xl/tight font-semibold">新建内容</h2>
            </div>

            <div className="mt-6 space-y-2">
              <CreateModeOption
                active={createInCategoryMode === "room"}
                description="新的聊天房间会放入当前分类。"
                icon={<RoomChatIcon className="size-4" />}
                inputName="create_in_category_mode"
                label="创建房间"
                disabled={isCreateRoomSubmitting}
                onSelect={() => setCreateInCategoryMode("room")}
              />

              <CreateModeOption
                active={createInCategoryMode === "doc"}
                description="仅 KP 可创建，文档会放入当前分类。"
                disabled={!isKPInSpace || isCreateRoomSubmitting}
                icon={<FileTextIcon className="size-4" weight="regular" />}
                inputName="create_in_category_mode"
                label="创建文档"
                onSelect={() => setCreateInCategoryMode("doc")}
              />
            </div>
          </aside>

          <main className="
            hidden-scrollbar min-h-0 flex-1 overflow-y-auto bg-base-100 p-5
            pr-14
            lg:p-6 lg:pr-14
          ">
            {createInCategoryMode === "doc"
              ? (
                  <div className="flex h-full min-h-[440px] flex-col">
                    <header className="border-b border-base-300/70 pb-4">
                      <h3 className="text-lg/7 font-semibold">文档信息</h3>
                    </header>

                    <div className="
                      hidden-scrollbar flex-1 overflow-y-auto py-6
                    ">
                      <label className="
                        mb-2 block text-sm font-medium text-base-content/75
                      " htmlFor="create-doc-title-input">
                        文档标题
                      </label>
                      <TextInput
                        id="create-doc-title-input"
                        className="text-base"
                        defaultValue={createDocTitle}
                        ref={docTitleInputRef}
                        onChange={(e) => {
                          draftDocTitleRef.current = e.target.value;
                        }}
                        placeholder="请输入文档标题"
                      />
                    </div>

                    <footer className="
                      flex justify-end gap-2 border-t border-base-300/60 pt-4
                    ">
                      <Button
                        variant="ghost"
                        className="min-w-24"
                        onClick={closeCreateInCategory}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        className="min-w-36"
                        disabled={!isKPInSpace || !pendingCreateInCategoryId}
                        onClick={() => {
                          const nextTitle = docTitleInputRef.current?.value ?? draftDocTitleRef.current;
                          setCreateDocTitle(nextTitle);
                          void createDocInSelectedCategory(nextTitle);
                        }}
                      >
                        <PlusIcon className="size-4" weight="regular" />
                        创建文档
                      </Button>
                    </footer>
                  </div>
                )
              : (
                  <CreateRoomWindow
                    spaceId={activeSpaceId || -1}
                    spaceAvatarThumbUrl={activeSpaceAvatar}
                    isKP={isKPInSpace}
                    onCancel={closeCreateInCategory}
                    onSuccess={onRoomCreated}
                    onSubmittingChange={setIsCreateRoomSubmitting}
                  />
                )}
          </main>
        </div>
      </ToastWindow>

      <ToastWindow
        isOpen={canInvitePlayers && inviteRoomId !== null}
        onClose={() => setInviteRoomId(null)}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <AddMemberWindow
          handleAddMember={onAddRoomMember}
          showSpace={true}
          inviteCodeType={1}
          targetRoomId={inviteRoomId}
        />
      </ToastWindow>

      <ToastWindow
        isOpen={canInviteMembers && isMemberHandleOpen}
        onClose={() => {
          setIsMemberHandleOpen(false);
        }}
        disableScroll={true}
        panelClassName="!max-w-none !p-0 overflow-hidden rounded-lg border border-base-300/70 shadow-2xl"
      >
        <SpaceInvitePanel
          onAddSpectator={onAddSpaceMember}
          onAddPlayer={onAddSpacePlayer}
        />
      </ToastWindow>
    </>
  );
}

function CreateModeOption({
  active,
  description,
  disabled = false,
  icon,
  inputName,
  label,
  onSelect,
}: {
  active: boolean;
  description: string;
  disabled?: boolean;
  icon: ReactNode;
  inputName: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <label
      className={`
        group relative flex items-start gap-3 rounded-xl border p-3.5
        transition-all duration-200
        ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }
        ${
        active
          ? "border-info/60 bg-info/10 shadow-sm shadow-info/10"
          : `
            border-base-300/70 bg-base-100/60
            hover:border-info/30 hover:bg-base-100
          `
      }
      `}
    >
      <span
        className={`
          mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg
          transition
          ${
          active
            ? "bg-info/15 text-info"
            : `
              bg-base-200/70 text-base-content/70
              group-hover:bg-base-200
            `
        }
        `}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`
          block text-sm font-semibold
          ${active ? "text-info" : `text-base-content`}
        `}>
          {label}
        </span>
        <span className="mt-1 block text-xs/5 text-base-content/60">{description}</span>
      </span>
      <Radio
        density="compact"
        name={inputName}
        className="sr-only"
        checked={active}
        disabled={disabled}
        onChange={onSelect}
        aria-label={label}
      />
      <span
        className={`
          mt-1 size-4 shrink-0 rounded-full border-2 transition
          ${
          active
            ? `
              border-info bg-info
              shadow-[inset_0_0_0_3px_var(--fallback-b1,oklch(var(--b1)))]
            `
            : "border-base-300"
        }
        `}
        aria-hidden="true"
      />
    </label>
  );
}
