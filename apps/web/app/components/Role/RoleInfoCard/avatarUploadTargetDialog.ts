import type { UploadVariantTarget } from "./AvatarUploadCropper";

type PendingAvatarUpload = {
  files: File[];
  target: UploadVariantTarget;
};

/** 将弹窗中的待选文件转换为一次明确的上传提交；关闭弹窗不会经过这里。 */
export function resolvePendingAvatarUpload(
  files: File[] | null,
  target: UploadVariantTarget,
): PendingAvatarUpload | null {
  return files?.length ? { files, target } : null;
}
