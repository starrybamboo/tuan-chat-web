import type { StageEntityResponse } from "api";
import { RoomContext } from "@/components/chat/core/roomContext";
import React, { use } from "react";
import { useGetRoomItemsQuery } from "../../../../../api/hooks/spaceModuleHooks";

export default function ItemWindow({ setSelectedItemId }: {
  setSelectedItemId: (value: React.SetStateAction<number>) => void;
}) {
  const roomId = use(RoomContext).roomId;
  // 获取当前房间的所有物品
  const getRoomItemsQuery = useGetRoomItemsQuery(roomId ?? -1);
  const roomItems = (getRoomItemsQuery.data?.data ?? []) as StageEntityResponse[];
  return (
    <>
      <span className="block text-center mr-6 ml-6 text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-6">
        浏览该房间内所有物品
      </span>
      {roomItems?.length
        ? (
            <div className="space-y-3">
              {roomItems.map((item: StageEntityResponse) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-4 py-3 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {item.entityInfo?.image
                      ? (
                          <img
                            src={item.entityInfo?.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )
                      : (
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-500 dark:text-neutral-300">
                            无图片
                          </div>
                        )}
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {item.name}
                    </span>
                  </div>

                  {/* 右侧：按钮 */}
                  <button
                    type="button"
                    className="btn w-20"
                    onClick={() => setSelectedItemId(item.id ?? -1)}
                  >
                    查看
                  </button>
                </div>
              ))}
            </div>
          )
        : (
            <div className="text-center text-lg font-semibold text-neutral-500 dark:text-neutral-400">
              这个房间没有可以上传的物品了！
            </div>
          )}
    </>
  );
}
