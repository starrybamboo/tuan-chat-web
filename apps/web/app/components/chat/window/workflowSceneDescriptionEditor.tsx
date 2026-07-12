import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/common/Button";
import { TextArea } from "@/components/common/FormField";
import { MediaImage } from "@/components/common/mediaImage";

export const SCENE_DEFAULT_DESCRIPTION = "场景简要描述";

function normalizeSceneDefaultDescription(value?: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return SCENE_DEFAULT_DESCRIPTION;
  }
  return normalized;
}

type WorkflowSceneDescriptionEditorProps = {
  roomName: string;
  roomAvatar?: string;
  initialDescription?: string;
  onSave: (nextDescription: string) => Promise<void>;
}

export default function WorkflowSceneDescriptionEditor({
  roomName,
  roomAvatar,
  initialDescription,
  onSave,
}: WorkflowSceneDescriptionEditorProps) {
  const initialValue = useMemo(
    () => normalizeSceneDefaultDescription(initialDescription),
    [initialDescription],
  );
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    setValue(initialValue);
    setSaveState("idle");
  }, [initialValue]);

  const handleSave = async () => {
    if (isSaving)
      return;
    const nextValue = normalizeSceneDefaultDescription(value);
    setIsSaving(true);
    setSaveState("idle");
    try {
      await onSave(nextValue);
      setValue(nextValue);
      setSaveState("saved");
    }
    catch {
      setSaveState("error");
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-[50vw] max-w-[760px] min-w-[360px] p-4">
      <div className="mb-3 flex items-center gap-3">
        <MediaImage
          src={roomAvatar || "/favicon.ico"}
          alt={roomName}
          className="size-10 rounded-md border border-base-300 object-cover"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).src = "/favicon.ico";
          }}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{roomName}</div>
          <div className="text-xs text-base-content/60">场景简要描述（skip 模式展示）</div>
        </div>
      </div>

      <TextArea
        className="h-40"
        autoComplete="off"
        aria-label="场景描述"
        value={value}
        onChange={event => setValue(event.target.value)}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-base-content/60">
          {saveState === "saved" && "已保存"}
          {saveState === "error" && "保存失败，请重试"}
        </div>
        <Button
          variant="primary"
          size="sm"
          className="rounded-md"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving}
        >
          {isSaving ? "保存中..." : "保存场景简要描述"}
        </Button>
      </div>
    </div>
  );
}
