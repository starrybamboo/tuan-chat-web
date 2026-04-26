import type { MaterialAssetUploadKind } from "./materialComposerShared";
import { FileArrowUpIcon, ImageIcon, MusicNotesIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useId, useRef } from "react";
import toast from "react-hot-toast";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { useMaterialComposerContext } from "./materialComposerContext";

interface MaterialPackageAssetUploadButtonProps {
  kind: MaterialAssetUploadKind;
  disabled?: boolean;
  fullWidth?: boolean;
  onQueued?: () => void;
}

const buttonClassName = "inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-200/70 px-3 py-2 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-60";

function getActionLabel(kind: MaterialAssetUploadKind) {
  switch (kind) {
    case "image":
      return "添加图片";
    case "audio":
      return "添加音频";
    case "video":
      return "添加视频";
    case "file":
      return "添加文件";
  }
}

function getAccept(kind: MaterialAssetUploadKind) {
  switch (kind) {
    case "image":
      return "image/*";
    case "audio":
      return "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm";
    case "video":
      return "video/*,.mp4,.mov,.m4v,.avi,.mkv,.wmv,.flv,.mpeg,.mpg,.webm";
    case "file":
      return "*/*";
  }
}

function MaterialAssetUploadIcon({ kind }: { kind: MaterialAssetUploadKind }) {
  switch (kind) {
    case "image":
      return <ImageIcon className="size-4" />;
    case "audio":
      return <MusicNotesIcon className="size-4" />;
    case "video":
      return <VideoCameraIcon className="size-4" />;
    case "file":
      return <FileArrowUpIcon className="size-4" />;
  }
}

function matchesExpectedKind(kind: MaterialAssetUploadKind, file: File) {
  if (kind === "file") {
    return true;
  }
  if (kind === "image") {
    return file.type.startsWith("image/") || /\.(?:png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(file.name || "");
  }
  if (kind === "audio") {
    return file.type.startsWith("audio/") || /\.(?:mp3|wav|m4a|aac|ogg|opus|flac)$/i.test(file.name || "");
  }
  return file.type.startsWith("video/") || /\.(?:mp4|mov|m4v|avi|mkv|wmv|flv|mpeg|mpg|webm)$/i.test(file.name || "");
}

export default function MaterialPackageAssetUploadButton({
  kind,
  disabled = false,
  fullWidth = false,
  onQueued,
}: MaterialPackageAssetUploadButtonProps) {
  const { queueFiles } = useMaterialComposerContext();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedButtonClassName = `${buttonClassName} ${fullWidth ? "w-full justify-start" : ""}`;

  const handleSelect = (file: File) => {
    if (disabled) {
      return;
    }
    if (!matchesExpectedKind(kind, file)) {
      toast.error(`请选择${getActionLabel(kind).replace("添加", "")}文件`);
      return;
    }

    const queued = queueFiles([file]);
    if (queued) {
      onQueued?.();
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (kind === "image") {
    if (disabled) {
      return (
        <button type="button" className={resolvedButtonClassName} disabled>
          <MaterialAssetUploadIcon kind={kind} />
          <span>{getActionLabel(kind)}</span>
        </button>
      );
    }

    return (
      <ImgUploader setImg={handleSelect}>
        <button type="button" className={resolvedButtonClassName}>
          <MaterialAssetUploadIcon kind={kind} />
          <span>{getActionLabel(kind)}</span>
        </button>
      </ImgUploader>
    );
  }

  return (
    <>
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={getAccept(kind)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            handleSelect(file);
          }
        }}
      />
      <button
        type="button"
        className={resolvedButtonClassName}
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
      >
        <MaterialAssetUploadIcon kind={kind} />
        <span>{getActionLabel(kind)}</span>
      </button>
    </>
  );
}
