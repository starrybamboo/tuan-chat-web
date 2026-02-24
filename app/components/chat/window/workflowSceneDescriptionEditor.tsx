import { useEffect, useMemo, useState } from "react";

export const LEGACY_ROOM_DEFAULT_DESCRIPTION = "房间默认描述";
export const SCENE_DEFAULT_DESCRIPTION = "场景默认描述";

function normalizeSceneDefaultDescription(value?: string): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === LEGACY_ROOM_DEFAULT_DESCRIPTION)
    return SCENE_DEFAULT_DESCRIPTION;
  return normalized;
}

interface WorkflowSceneDescriptionEditorProps {
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
        <img
          src={roomAvatar || "/favicon.ico"}
          alt={roomName}
          className="h-10 w-10 rounded-md border border-base-300 object-cover"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).src = "/favicon.ico";
          }}
        />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold">{roomName}</div>
          <div className="text-xs text-base-content/60">场景默认描述（skip 模式展示）</div>
        </div>
      </div>

      <textarea
        className="textarea textarea-bordered rounded-md h-40 w-full resize-y"
        value={value}
        onChange={event => setValue(event.target.value)}
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-base-content/60">
          {saveState === "saved" && "已保存"}
          {saveState === "error" && "保存失败，请重试"}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-md"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "保存中..." : "保存场景默认描述"}
        </button>
      </div>
    </div>
  );
}
