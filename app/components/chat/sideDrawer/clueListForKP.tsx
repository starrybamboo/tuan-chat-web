import type { ClueMessage } from "api/models/ClueMessage";
import { PopWindow } from "@/components/common/popWindow";
import { useGetUserRoomsQuery } from "api/hooks/chatQueryHooks";
import { useGetRoomItemsQuery, useGetRoomLocationsQuery } from "api/hooks/spaceModuleHooks";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DisplayOfItemDetail from "../displayOfItemsDetail";
import DisplayOfLocationDetail from "../displayOfLocationDetail";
import { RoomContext } from "../roomContext";

export default function ClueListForPL({ onSend }: { onSend: (clue: ClueMessage) => void }) {
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
    <div className="space-y-3 p-3 overflow-auto flex flex-col items-center">
      {/* 标题和添加线索按钮 */}
      <div className="flex justify-between items-center w-full max-w-64 gap-2">
        <span className="font-medium text-lg">持有线索</span>
      </div>

      {/* 房间列表 */}
      <div className="w-full space-y-3">
        {rooms.length === 0
          ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>暂无房间</p>
                <p className="text-sm mt-1">请先创建或加入房间</p>
              </div>
            )
          : (
              rooms.map((room) => {
                const hasLocations = roomLocations.length > 0;
                const hasItems = roomItems.length > 0;
                const hasClues = hasLocations || hasItems;

                return (
                  <div key={room.roomId} className="w-full">
                    {/* 房间列表项 */}
                    <button
                      type="button"
                      onClick={() => toggleRoom(room.roomId ?? -1)}
                      className="btn flex w-full max-w-64 mx-auto gap-3 p-3 bg-base-200 rounded-lg items-center hover:bg-base-300 transition border border-base-300"
                      aria-expanded={openRoomId === room.roomId}
                      aria-controls={`clue-drawer-${room.roomId}`}
                    >
                      <div className="avatar mask mask-circle w-8 flex-shrink-0">
                        <img src={room.avatar} alt={room.name} />
                      </div>
                      <span className="truncate flex-1 text-left font-medium">
                        {room.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <svg
                          className={`h-4 w-4 transform transition-transform flex-shrink-0 ${openRoomId === room.roomId ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {openRoomId === room.roomId && (
                      <div id={`clue-drawer-${room.roomId}`} className="mt-2 ml-4 space-y-3">
                        {getRoomLocationsQuery.isLoading && (
                          <div className="flex justify-center py-2">
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <div className="loading loading-spinner loading-xs"></div>
                              加载中...
                            </div>
                          </div>
                        )}
                        {getRoomLocationsQuery.isError && (
                          <div className="text-sm text-red-500 text-center">加载失败</div>
                        )}

                        {/* 无线索提示 */}
                        {!hasClues && !getRoomLocationsQuery.isLoading && (
                          <div className="text-center py-4 text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="text-sm">该房间暂无线索</p>
                          </div>
                        )}

                        {/* 物品区域 */}
                        {hasItems && (
                          <div className="w-full">
                            <button
                              type="button"
                              onClick={() => toggleSection(`items-${room.roomId}`)}
                              className="btn flex w-full max-w-56 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
                              aria-expanded={expandedSections.has(`items-${room.roomId}`)}
                              aria-controls={`items-drawer-${room.roomId}`}
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                              <span className="truncate flex-1 text-left text-sm font-medium">
                                物品线索
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="badge badge-sm badge-primary badge-outline">
                                  {roomItems.length}
                                </span>
                                <svg
                                  className={`h-4 w-4 transform transition-transform ${expandedSections.has(`items-${room.roomId}`) ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {expandedSections.has(`items-${room.roomId}`) && (
                              <div
                                id={`items-drawer-${room.roomId}`}
                                className="mt-2 ml-2 space-y-2 animate-fade-in"
                              >
                                {roomItems.map(item => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300"
                                  >
                                    <div className="flex items-center gap-2">
                                      {item.entityInfo?.image
                                        ? (
                                            <img
                                              src={item.entityInfo.image}
                                              alt={item.name}
                                              className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                            />
                                          )
                                        : (
                                            <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                          )}
                                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-32">
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
                              className="btn flex w-full max-w-56 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
                              aria-expanded={expandedSections.has(`locations-${room.roomId}`)}
                              aria-controls={`locations-drawer-${room.roomId}`}
                            >
                              <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                                <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </div>
                              <span className="truncate flex-1 text-left text-sm font-medium">
                                地点线索
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="badge badge-sm badge-success badge-outline">
                                  {roomLocations.length}
                                </span>
                                <svg
                                  className={`h-4 w-4 transform transition-transform ${expandedSections.has(`locations-${room.roomId}`) ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </button>

                            {expandedSections.has(`locations-${room.roomId}`) && (
                              <div
                                id={`locations-drawer-${room.roomId}`}
                                className="mt-2 ml-2 space-y-2 animate-fade-in"
                              >
                                {roomLocations.map(location => (
                                  <div
                                    key={location.id}
                                    className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                      </div>
                                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-32">
                                        {location.name}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
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
              })
            )}
      </div>

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
