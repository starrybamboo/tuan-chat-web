import type { ClueMessage } from "api/models/ClueMessage";
import { PopWindow } from "@/components/common/popWindow";
import { useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useGetRoomItemsQuery, useGetRoomLocationsQuery } from "api/hooks/spaceModuleHooks";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DisplayOfItemDetail from "../displayOfItemsDetail";
import DisplayOfLocationDetail from "../displayOfLocationDetail";
import { RoomContext } from "../roomContext";

export default function ClueList({ onSend }: { onSend: (clue: ClueMessage) => void }) {
  const { spaceId } = use(RoomContext);
  const userRoomQuery = useGetUserRoomsQuery(spaceId ?? -1);
  const rooms = useMemo(
    () => userRoomQuery.data?.data ?? [],
    [userRoomQuery.data?.data],
  );

  const [selectedRoomId, setSelectedRoomId] = useState(-1);
  const getRoomLocationsQuery = useGetRoomLocationsQuery(selectedRoomId);
  const roomLocations = getRoomLocationsQuery.data?.data ?? [];

  const getRoomItemsQuery = useGetRoomItemsQuery(selectedRoomId);
  const roomItems = getRoomItemsQuery.data?.data ?? [];

  const [openRoomId, setOpenRoomId] = useState<number | null>(null);
  const toggleRoom = (roomId: number) => {
    setOpenRoomId(prev => (prev === roomId ? null : roomId));
    setSelectedRoomId(prev => (prev === roomId ? -1 : roomId));
  };

  const [selectedItemId, setSelectedItemId] = useState<number>(-1);
  const [selectedLocationId, setSelectedLocationId] = useState<number>(-1);

  const handleSend = (clue: ClueMessage) => {
    onSend(clue);
    setSelectedItemId(-1);
    setSelectedLocationId(-1);
    toast("发送成功");
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      }
      else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-2 p-2 overflow-auto flex flex-col items-center">
      <div className="flex justify-center items-center gap-2 min-w-60">
        <span>持有线索</span>
      </div>

      {rooms.map((room) => {
        const hasLocations = roomLocations.length > 0;
        const hasItems = roomItems.length > 0;

        return (
          <div key={room.roomId} className="w-full">
            {/* 房间列表项 */}
            <button
              type="button"
              onClick={() => toggleRoom(room.roomId ?? -1)}
              className="btn flex w-60 mx-auto gap-3 p-3 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
              aria-expanded={openRoomId === room.roomId}
              aria-controls={`clue-drawer-${room.roomId}`}
            >
              <div className="avatar mask mask-circle w-8">
                <img src={room.avatar} alt={room.name} />
              </div>
              <span className="truncate flex-1 text-left">
                {room.name}
              </span>
              <svg
                className={`h-5 w-5 transform transition-transform ${openRoomId === room.roomId ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {openRoomId === room.roomId && (
              <div id={`clue-drawer-${room.roomId}`} className="mt-2 ml-6 space-y-3">
                {getRoomLocationsQuery.isLoading && (
                  <div className="text-sm text-gray-500">加载中...</div>
                )}
                {getRoomLocationsQuery.isError && (
                  <div className="text-sm text-red-500">加载失败</div>
                )}

                {/* 无线索提示 */}
                {!hasLocations && !hasItems && (
                  <div className="text-sm text-gray-500 ml-2">该房间没有线索</div>
                )}

                {/* 物品区域 */}
                {hasItems && (
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => toggleSection(`items-${room.roomId}`)}
                      className="btn flex w-56 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
                      aria-expanded={expandedSections.has(`items-${room.roomId}`)}
                      aria-controls={`items-drawer-${room.roomId}`}
                    >
                      <span className="truncate flex-1 text-left text-sm">
                        物品
                      </span>
                      <svg
                        className={`h-4 w-4 transform transition-transform ${expandedSections.has(`items-${room.roomId}`) ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedSections.has(`items-${room.roomId}`) && (
                      <div
                        id={`items-drawer-${room.roomId}`}
                        className="mt-1 ml-10 space-y-2 animate-fade-in"
                      >
                        {roomItems.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {item.entityInfo?.image
                                ? (
                                    <img
                                      src={item.entityInfo.image}
                                      alt={item.name}
                                      className="w-6 h-6 rounded-full object-cover"
                                    />
                                  )
                                : (
                                    <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-500 dark:text-neutral-300">
                                      物品
                                    </div>
                                  )}
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {item.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              onClick={() => setSelectedItemId(item.id ?? -1)}
                            >
                              查看
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 地点区域 */}
                {hasLocations && (
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => toggleSection(`locations-${room.roomId}`)}
                      className="btn flex w-56 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
                      aria-expanded={expandedSections.has(`locations-${room.roomId}`)}
                      aria-controls={`locations-drawer-${room.roomId}`}
                    >
                      <span className="truncate flex-1 text-left text-sm">
                        地点
                      </span>
                      <svg
                        className={`h-4 w-4 transform transition-transform ${expandedSections.has(`locations-${room.roomId}`) ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedSections.has(`locations-${room.roomId}`) && (
                      <div
                        id={`locations-drawer-${room.roomId}`}
                        className="mt-1 ml-10 space-y-2 animate-fade-in"
                      >
                        {roomLocations.map(location => (
                          <div
                            key={location.id}
                            className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                                <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                                {location.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                              onClick={() => setSelectedLocationId(location.id ?? -1)}
                            >
                              查看
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      {/* 物品详情窗口 */}
      <PopWindow
        isOpen={selectedItemId > 0}
        onClose={() => setSelectedItemId(-1)}
        hiddenScrollbar={true}
      >
        {selectedItemId && (
          <DisplayOfItemDetail itemId={selectedItemId} onSend={handleSend} />
        )}
      </PopWindow>
      {/* 地点详情窗口 */}
      <PopWindow
        isOpen={selectedLocationId > 0}
        onClose={() => setSelectedLocationId(-1)}
        hiddenScrollbar={true}
      >
        {selectedLocationId && (
          <DisplayOfLocationDetail locationId={selectedLocationId} onSend={handleSend} />
        )}
      </PopWindow>
    </div>
  );
}
