import type { Room } from "@tuanchat/openapi-client/models/Room";
import { appToast } from "@/components/common/appToast/appToast";

import { CaretDown, Check, X } from "@phosphor-icons/react";
import { useUpdateRoomMutation } from "api/hooks/chatQueryHooks";
import { AnimatePresence } from "motion/react";
import React from "react";
import { Button } from "@/components/common/Button";
import { TextArea } from "@/components/common/FormField";
import { IconButton } from "@/components/common/IconButton";
import { FloatingMotionPanel } from "@/components/common/motion/FloatingMotionPanel";

type RoomDescriptionDropdownProps = {
  room?: Room | null;
}

export default function RoomDescriptionDropdown({ room }: RoomDescriptionDropdownProps) {
  const updateRoomMutation = useUpdateRoomMutation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(room?.description ?? "");
  const dropdownId = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const roomId = room?.roomId;
  const currentDescription = room?.description ?? "";
  const hasChanges = draft !== currentDescription;

  React.useEffect(() => {
    if (!isOpen) {
      setDraft(currentDescription);
    }
  }, [currentDescription, isOpen]);

  React.useEffect(() => {
    if (!isOpen)
      return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node))
        return;
      if (rootRef.current?.contains(target))
        return;
      setIsOpen(false);
      setDraft(currentDescription);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape")
        return;
      setIsOpen(false);
      setDraft(currentDescription);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [currentDescription, isOpen]);

  const handleSave = async () => {
    if (!roomId || updateRoomMutation.isPending)
      return;
    try {
      await updateRoomMutation.mutateAsync({
        roomId,
        name: room?.name,
        avatarFileId: room?.avatarFileId,
        description: draft,
      });
      appToast.success("房间描述已保存");
      setIsOpen(false);
    }
    catch {
      appToast.error("保存房间描述失败，请重试");
    }
  };

  const handleCancel = () => {
    setDraft(currentDescription);
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center">
      <IconButton
        size="xs"
        shape="square"
        label={isOpen ? "收起房间描述编辑" : "展开房间描述编辑"}
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        title="编辑房间描述"
        disabled={!roomId}
        onClick={() => {
          setIsOpen(value => !value);
          if (!isOpen) {
            setDraft(currentDescription);
          }
        }}
        icon={<CaretDown className={`
          size-4 transition-transform motion-reduce:transition-none
          ${isOpen ? `rotate-180` : ""}
        `} />}
      />

      <AnimatePresence initial={false}>
        {isOpen && (
          <FloatingMotionPanel className="
            absolute left-0 top-full z-9999 mt-2 w-[min(92vw,28rem)] rounded-md
            border border-base-300 bg-base-100 p-3 shadow-xl
          " id={dropdownId}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0 text-sm font-medium">房间描述</div>
              <IconButton
                size="xs"
                shape="square"
                label="关闭房间描述编辑"
                onClick={handleCancel}
                icon={<X className="size-4" />}
              />
            </div>
            <TextArea
              className="min-h-32 text-sm"
              value={draft}
              autoComplete="off"
              aria-label="房间描述"
              placeholder="填写房间描述..."
              onChange={event => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing)
                  return;
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleSave();
                }
              }}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-md"
                onClick={handleCancel}
                disabled={updateRoomMutation.isPending}
              >
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="rounded-md"
                onClick={() => void handleSave()}
                loading={updateRoomMutation.isPending}
                disabled={!hasChanges || updateRoomMutation.isPending}
                title={!hasChanges ? "没有变更可保存" : undefined}
              >
                <Check className="size-4" />
                {updateRoomMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </div>
          </FloatingMotionPanel>
        )}
      </AnimatePresence>
    </div>
  );
}
