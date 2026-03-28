import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import { FileArrowUpIcon, ImageIcon, MusicNotesIcon, VideoCameraIcon } from "@phosphor-icons/react";
import { useId, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";
import { MessageType } from "../../../../api/wsModels";

type MaterialAssetUploadKind = "image" | "audio" | "video" | "file";

interface MaterialPackageAssetUploadButtonProps {
  kind: MaterialAssetUploadKind;
  disabled?: boolean;
  fullWidth?: boolean;
  onUploaded: (message: MaterialMessageItem) => void;
}

const buttonClassName = "inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-200/70 px-3 py-2 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-60";

function getUploadLabel(kind: MaterialAssetUploadKind) {
  switch (kind) {
    case "image":
      return "上传图片";
    case "audio":
      return "上传音频";
    case "video":
      return "上传视频";
    case "file":
      return "上传文件";
  }
}

function getUploadAccept(kind: MaterialAssetUploadKind) {
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

function getIcon(kind: MaterialAssetUploadKind) {
  switch (kind) {
    case "image":
      return ImageIcon;
    case "audio":
      return MusicNotesIcon;
    case "video":
      return VideoCameraIcon;
    case "file":
      return FileArrowUpIcon;
  }
}

async function getMediaDuration(file: File): Promise<number | undefined> {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<number | undefined>((resolve) => {
      const element = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      const cleanup = () => {
        element.onloadedmetadata = null;
        element.onerror = null;
        URL.revokeObjectURL(objectUrl);
      };

      element.preload = "metadata";
      element.src = objectUrl;
      element.onloadedmetadata = () => {
        const duration = Number.isFinite(element.duration) && element.duration > 0
          ? Math.max(1, Math.round(element.duration))
          : undefined;
        cleanup();
        resolve(duration);
      };
      element.onerror = () => {
        cleanup();
        resolve(undefined);
      };
    });
  }
  catch {
    URL.revokeObjectURL(objectUrl);
    return undefined;
  }
}

export default function MaterialPackageAssetUploadButton({
  kind,
  disabled = false,
  fullWidth = false,
  onUploaded,
}: MaterialPackageAssetUploadButtonProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadUtilsRef = useRef(new UploadUtils());
  const [isUploading, setIsUploading] = useState(false);
  const Icon = useMemo(() => getIcon(kind), [kind]);
  const resolvedButtonClassName = `${buttonClassName} ${fullWidth ? "w-full justify-start" : ""}`;

  const handleUpload = async (file: File) => {
    if (disabled || isUploading) {
      return;
    }

    setIsUploading(true);
    const toastId = `material-upload-${kind}-${Date.now()}`;
    toast.loading(`${getUploadLabel(kind)}中...`, { id: toastId });

    try {
      let message: MaterialMessageItem;
      if (kind === "image") {
        const url = await uploadUtilsRef.current.uploadImg(file, 1);
        const { width, height, size } = await getImageSize(file);
        message = {
          messageType: MessageType.IMG,
          content: "",
          annotations: ["background"],
          extra: {
            imageMessage: {
              url,
              fileName: file.name,
              width,
              height,
              size,
              background: true,
            },
          },
        };
      }
      else if (kind === "audio") {
        const second = await getMediaDuration(file);
        const url = await uploadUtilsRef.current.uploadAudio(file, 1, 0);
        message = {
          messageType: MessageType.SOUND,
          content: "",
          annotations: ["bgm"],
          extra: {
            soundMessage: {
              url,
              fileName: file.name,
              size: file.size,
              second,
              purpose: "bgm",
            },
          },
        };
      }
      else if (kind === "video") {
        const second = await getMediaDuration(file);
        const uploaded = await uploadUtilsRef.current.uploadVideo(file, 1);
        message = {
          messageType: MessageType.VIDEO,
          content: "",
          extra: {
            videoMessage: {
              url: uploaded.url,
              fileName: uploaded.fileName,
              size: uploaded.size,
              second,
            },
          },
        };
      }
      else {
        const url = await uploadUtilsRef.current.uploadFile(file, 1);
        message = {
          messageType: MessageType.FILE,
          content: "",
          extra: {
            fileMessage: {
              url,
              fileName: file.name,
              size: file.size,
            },
          },
        };
      }

      onUploaded(message);
      toast.success(`${getUploadLabel(kind)}成功`, { id: toastId });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`${getUploadLabel(kind)}失败：${message}`, { id: toastId });
    }
    finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (kind === "image") {
    if (disabled) {
      return (
        <button type="button" className={resolvedButtonClassName} disabled>
          <Icon className="size-4" />
          <span>{getUploadLabel(kind)}</span>
        </button>
      );
    }

    return (
      <ImgUploader setImg={(file) => { void handleUpload(file); }}>
        <button type="button" className={resolvedButtonClassName} disabled={isUploading}>
          <Icon className="size-4" />
          <span>{isUploading ? "上传中..." : getUploadLabel(kind)}</span>
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
        accept={getUploadAccept(kind)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />
      <button
        type="button"
        className={resolvedButtonClassName}
        disabled={disabled || isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon className="size-4" />
        <span>{isUploading ? "上传中..." : getUploadLabel(kind)}</span>
      </button>
    </>
  );
}
