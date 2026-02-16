import type { Sticker } from "api/models/Sticker";
import { useCreateStickerMutation, useDeleteStickerMutation, useGetUserStickersQuery } from "api/hooks/stickerQueryHooks";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";

const SUPPORTED_STICKER_FORMATS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function normalizeStickerFormat(format?: string | null): string | null {
  if (!format)
    return null;
  const next = format.toLowerCase();
  return SUPPORTED_STICKER_FORMATS.has(next) ? next : null;
}

function resolveStickerFormat(file: File, imageUrl: string): string | null {
  const cleanUrl = imageUrl.split("?")[0].split("#")[0];
  const fromUrl = normalizeStickerFormat(cleanUrl.split(".").pop());
  if (fromUrl) {
    return fromUrl;
  }

  const fromType = normalizeStickerFormat(file.type.split("/").pop());
  if (fromType) {
    return fromType;
  }
  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "请求失败，请稍后重试";
}

export default function StickerWindow({ onChoose }:
{
  onChoose: (sticker: Sticker) => void; // 选择表情的回调函数
}) {
  const { data: stickersData } = useGetUserStickersQuery();
  const stickerList = Array.isArray(stickersData?.data) ? stickersData.data : [];
  const deleteStickerMutation = useDeleteStickerMutation();
  const [deleteButtonVisible, setDeleteButtonVisible] = useState(false);

  // 新增表情
  const createStickerMutation = useCreateStickerMutation();
  const uploadUtils = new UploadUtils();
  const handleAddSticker = async (newImg: File) => {
    if (!newImg) {
      return;
    }
    const selectedFormat = normalizeStickerFormat(newImg.type.split("/").pop());
    if (!selectedFormat) {
      toast.error("表情仅支持 jpg/jpeg/png/gif/webp");
      return;
    }
    try {
      const imageUrl = await uploadUtils.uploadImg(newImg, 2);
      const format = resolveStickerFormat(newImg, imageUrl);

      if (!format) {
        toast.error("表情仅支持 jpg/jpeg/png/gif/webp");
        return;
      }

      const measured = await getImageSize(imageUrl);
      const stickerCreateRequest = {
        name: newImg.name,
        imageUrl,
        fileSize: measured.size > 0 ? measured.size : newImg.size,
        width: measured.width > 0 ? measured.width : undefined,
        height: measured.height > 0 ? measured.height : undefined,
        format,
      };

      createStickerMutation.mutate(stickerCreateRequest, {
        onError: (error) => {
          toast.error(getErrorMessage(error));
        },
      });
    }
    catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  // 删除表情
  const onDelete = (stickerId: number) => {
    if (stickerId <= 0) {
      return;
    }
    deleteStickerMutation.mutate(stickerId, {
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  return (
    <div className="w-full">
      {/* 显示表情 */}
      <div className="grid grid-cols-4 md:grid-cols-5 mb-2 max-h-80 p-1 overflow-y-auto overflow-x-hidden">
        {/* 添加新表情 */}
        <ImgUploader setImg={(newImg) => { handleAddSticker(newImg); }}>
          <div className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-1 transition-transform">
            <div className="flex items-center justify-center h-full text-base-content/70">
              <span className="text-2xl">+</span>
            </div>
          </div>
        </ImgUploader>

        {stickerList.length === 0
          ? (
              <div className="col-span-4 md:col-span-5 text-center text-base-content/70 h-20 flex items-center justify-center">暂无表情包</div>
            )
          : (
              stickerList.map(sticker => (
                <div
                  key={sticker.stickerId}
                  onClick={() => { onChoose(sticker); }}
                  className={`aspect-square cursor-pointer rounded-lg p-1 transition-transform relative ${deleteButtonVisible ? "" : "hover:scale-105"}`}
                >
                  <img
                    src={sticker.imageUrl}
                    alt={sticker.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                  {/* 删除按钮 */}
                  {deleteButtonVisible && (
                    <button
                      type="button"
                      className="cursor-pointer absolute top-0 right-0 rounded-full size-5 flex items-center justify-center bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(sticker.stickerId || -1);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
        {stickerList.length !== 0 && (
          <div
            className="aspect-square cursor-pointer hover:bg-base-200 rounded-lg p-1 transition-transform"
            onClick={() => {
              setDeleteButtonVisible(!deleteButtonVisible);
            }}
          >
            <div className="flex items-center justify-center h-full text-base-content/70">
              <span className="text-xl">×</span>
            </div>
          </div>
        )}
      </div>
      {/* 选择表情包列表 */}
      <div className="flex">
        {/* 自定义 */}
        <button type="button" className="btn btn-ghost btn-sm">
          <span>自定义表情</span>
        </button>
        {/* more emoji */}
      </div>
    </div>
  );
}
