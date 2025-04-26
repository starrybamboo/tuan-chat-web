import { SpaceContext } from "@/components/chat/spaceContext";
import { EditableField } from "@/components/common/EditableFiled";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { use } from "react";
import {
  useDissolveSpaceMutation,
  useGetSpaceInfoQuery,
  useUpdateSpaceMutation,
} from "../../../../api/queryHooks";

function SpaceSettingWindow({ onClose }: { onClose: () => void }) {
  const spaceContext = use(SpaceContext);
  // 获取群组数据
  const spaceId = Number(spaceContext.spaceId);
  const getSpaceInfoQuery = useGetSpaceInfoQuery(spaceId ?? -1);
  const space = getSpaceInfoQuery.data?.data;
  // 解散群组
  const dissolveSpaceMutation = useDissolveSpaceMutation();
  // 更新群头像
  const updateSpaceMutation = useUpdateSpaceMutation();

  return (
    <div className="w-full p-4 min-w-[40vw]">
      {space && (
        <div className="">
          <div className="flex justify-center">
            <ImgUploaderWithCopper
              setCopperedDownloadUrl={(url) => {
                updateSpaceMutation.mutate({ spaceId, avatar: url });
              }}
              fileName={`spaceId-${space.spaceId}`}
            >
              <div className="relative group overflow-hidden rounded-lg">
                <img
                  src={space.avatar}
                  alt={space.name}
                  className="w-24 h-24 mx-auto rounded-lg transition-all duration-300 group-hover:scale-110 group-hover:brightness-75 rounded"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-opacity-20 backdrop-blur-sm"
                >
                  <span className="text-white font-medium px-2 py-1 rounded">
                    更新群头像
                  </span>
                </div>
              </div>
            </ImgUploaderWithCopper>
          </div>
          <EditableField
            content={space.name ?? ""}
            handleContentUpdate={name => updateSpaceMutation.mutate({ spaceId, name })}
            className="text-2xl font-bold text-center my-4"
          >
          </EditableField>
          <EditableField
            content={space.description ?? ""}
            handleContentUpdate={description => updateSpaceMutation.mutate({ spaceId, description })}
            className="text-gray-600 text-center"
          >
          </EditableField>
          <div className="flex justify-center mt-16">
            <button
              type="button"
              className="btn btn-error"
              onClick={() => dissolveSpaceMutation.mutate(spaceId, {
                onSuccess: () => {
                  onClose();
                },
              })}
            >
              解散房间
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceSettingWindow;
