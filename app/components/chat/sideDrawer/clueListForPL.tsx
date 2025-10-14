import type { SpaceClueCreateRequest } from "api";
import type { ClueMessage } from "api/models/ClueMessage";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useAddCluesMutation, useGetCluesBySpaceQuery } from "api/hooks/spaceClueHooks";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import DisplayOfItemDetail from "../displayOfItemsDetail";
import DisplayOfLocationDetail from "../displayOfLocationDetail";
import { RoomContext } from "../roomContext";

export default function ClueListForPL({ onSend }: { onSend: (clue: ClueMessage) => void }) {
  const { spaceId } = use(RoomContext);

  const getCluesBySpaceQuery = useGetCluesBySpaceQuery(spaceId ?? -1);
  const clues = useMemo(() =>
    getCluesBySpaceQuery.data?.data ?? [], [getCluesBySpaceQuery.data?.data]);

  // 添加线索
  const addCluesMutation = useAddCluesMutation();

  const [selectedManualClue, setSelectedManualClue] = useState<any>(null);

  const handleSend = (clue: ClueMessage) => {
    onSend(clue);
    setSelectedManualClue(null);
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

  const [showAddClue, setShowAddClue] = useState(false);
  // 添加线索表单状态
  const [newClue, setNewClue] = useState({
    name: "",
    description: "",
    image: "",
    note: "",
    type: "ITEM" as "ITEM" | "LOCATION" | "OTHER",
  });

  const handleAddClue = async () => {
    if (!newClue.name.trim()) {
      toast.error("请输入线索名称");
      return;
    }

    // 新增描述必填验证
    if (!newClue.description.trim()) {
      toast.error("请输入线索描述");
      return;
    }

    try {
      const request: Array<SpaceClueCreateRequest> = [
        {
          spaceId: spaceId ?? -1,
          name: newClue.name,
          description: newClue.description,
          image: newClue.image,
          note: newClue.note,
          type: newClue.type,
        },
      ];

      await addCluesMutation.mutateAsync(request);

      toast.success("添加线索成功");
      setShowAddClue(false);
      // 重置表单
      setNewClue({
        name: "",
        description: "",
        image: "",
        type: "ITEM",
        note: "",
      });
    }
    catch {
      toast.error("添加线索失败");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setNewClue(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const itemClues = useMemo(() =>
    clues.filter(clue => clue.type === "ITEM"), [clues]);

  const locationClues = useMemo(() =>
    clues.filter(clue => clue.type === "LOCATION"), [clues]);

  const otherClues = useMemo(() =>
    clues.filter(clue => clue.type !== "ITEM" && clue.type !== "LOCATION"), [clues]);

  // 处理查看线索详情
  const handleViewClue = (clue: any) => {
    setSelectedManualClue({
      name: clue.name,
      description: clue.description,
      image: clue.image,
      note: clue.note,
      type: clue.type,
    });
  };

  const renderDetailComponent = () => {
    if (!selectedManualClue)
      return null;

    const manualData = {
      name: selectedManualClue.name,
      description: selectedManualClue.description,
      image: selectedManualClue.image,
      note: selectedManualClue.note,
    };

    if (selectedManualClue.type === "ITEM") {
      return (
        <DisplayOfItemDetail
          manualData={manualData}
          onSend={handleSend}
        />
      );
    }
    else if (selectedManualClue.type === "LOCATION") {
      return (
        <DisplayOfLocationDetail
          manualData={manualData}
          onSend={handleSend}
        />
      );
    }
    else {
      return (
        <DisplayOfItemDetail
          manualData={manualData}
          onSend={handleSend}
        />
      );
    }
  };

  return (
    <div className="space-y-3 p-3 overflow-auto flex flex-col items-center">
      {/* 标题和添加线索按钮 */}
      <div className="flex justify-between items-center w-full max-w-64 gap-2">
        <span className="font-medium text-lg">持有线索</span>
        <button
          type="button"
          onClick={() => setShowAddClue(true)}
          className="btn btn-primary btn-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加线索
        </button>
      </div>

      {/* 线索列表 */}
      <div className="w-full space-y-3">
        <div className="w-full space-y-4">
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection("items")}
              className="btn flex w-full max-w-64 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
              aria-expanded={expandedSections.has("items")}
              aria-controls="items-drawer"
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
                  {itemClues.length}
                </span>
                <svg
                  className={`h-4 w-4 transform transition-transform ${expandedSections.has("items") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedSections.has("items") && (
              <div
                id="items-drawer"
                className="mt-2 space-y-2 animate-fade-in max-w-64 mx-auto"
              >
                {itemClues.length === 0
                  ? (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        暂无物品线索
                      </div>
                    )
                  : (
                      itemClues.map(clue => (
                        <div
                          key={clue.id}
                          className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300 w-full"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {clue.image
                              ? (
                                  <img
                                    src={clue.image}
                                    alt={clue.name}
                                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  />
                                )
                              : (
                                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  </div>
                                )}
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate flex-1">
                              {clue.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex-shrink-0 ml-2"
                            onClick={() => handleViewClue(clue)}
                          >
                            查看
                          </button>
                        </div>
                      ))
                    )}
              </div>
            )}
          </div>

          {/* 地点线索 */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection("locations")}
              className="btn flex w-full max-w-64 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
              aria-expanded={expandedSections.has("locations")}
              aria-controls="locations-drawer"
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
                  {locationClues.length}
                </span>
                <svg
                  className={`h-4 w-4 transform transition-transform ${expandedSections.has("locations") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedSections.has("locations") && (
              <div
                id="locations-drawer"
                className="mt-2 space-y-2 animate-fade-in max-w-64 mx-auto"
              >
                {locationClues.length === 0
                  ? (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        暂无地点线索
                      </div>
                    )
                  : (
                      locationClues.map(clue => (
                        <div
                          key={clue.id}
                          className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300 w-full"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate flex-1">
                              {clue.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex-shrink-0 ml-2"
                            onClick={() => handleViewClue(clue)}
                          >
                            查看
                          </button>
                        </div>
                      ))
                    )}
              </div>
            )}
          </div>

          {/* 其他线索 */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => toggleSection("others")}
              className="btn flex w-full max-w-64 mx-auto gap-3 p-2 bg-base-200 rounded-lg items-center hover:bg-base-300 transition"
              aria-expanded={expandedSections.has("others")}
              aria-controls="others-drawer"
            >
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="truncate flex-1 text-left text-sm font-medium">
                其他线索
              </span>
              <div className="flex items-center gap-2">
                <span className="badge badge-sm badge-secondary badge-outline">
                  {otherClues.length}
                </span>
                <svg
                  className={`h-4 w-4 transform transition-transform ${expandedSections.has("others") ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedSections.has("others") && (
              <div
                id="others-drawer"
                className="mt-2 space-y-2 animate-fade-in max-w-64 mx-auto"
              >
                {otherClues.length === 0
                  ? (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        暂无其他线索
                      </div>
                    )
                  : (
                      otherClues.map(clue => (
                        <div
                          key={clue.id}
                          className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300 w-full"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                              <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate flex-1">
                              {clue.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex-shrink-0 ml-2"
                            onClick={() => handleViewClue(clue)}
                          >
                            查看
                          </button>
                        </div>
                      ))
                    )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 添加线索模态框 */}
      <PopWindow
        isOpen={showAddClue}
        onClose={() => setShowAddClue(false)}
      >
        <div className="max-w-md w-full mx-auto bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
          {/* 头部区域 */}
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-4">
              <ImgUploaderWithCopper
                setCopperedDownloadUrl={(url) => {
                  handleInputChange("image", url);
                }}
                fileName={`clue-image-${Date.now()}`}
              >
                <div className="relative group overflow-hidden rounded-lg w-16 h-16 cursor-pointer border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300">
                  {newClue.image
                    ? (
                        <>
                          <img
                            src={newClue.image}
                            alt="线索图片"
                            className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm">
                            <div className="text-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 block">
                                更换
                              </span>
                            </div>
                          </div>
                        </>
                      )
                    : (
                        <div className="w-full h-full flex flex-col items-center justify-center transition-all duration-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                          <svg className="w-6 h-6 text-neutral-400 dark:text-neutral-500 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors mt-1">
                            上传
                          </span>
                        </div>
                      )}
                </div>
              </ImgUploaderWithCopper>
              <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 flex-grow">
                添加新线索
              </h2>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                线索名称 *
              </label>
              <input
                type="text"
                value={newClue.name}
                onChange={e => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入线索名称"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                线索类型
              </label>
              <select
                value={newClue.type}
                onChange={e => handleInputChange("type", e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ITEM">物品线索</option>
                <option value="LOCATION">地点线索</option>
                <option value="OTHER">其他线索</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                描述 *
              </label>
              <textarea
                value={newClue.description}
                onChange={e => handleInputChange("description", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入线索描述"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                笔记
              </label>
              <textarea
                value={newClue.note}
                onChange={e => handleInputChange("note", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="请输入线索笔记"
              />
            </div>
          </div>

          {/* 底部按钮区域 */}
          <div className="p-5 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-ghost px-4 py-2"
              onClick={() => setShowAddClue(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0"
              onClick={handleAddClue}
              disabled={addCluesMutation.isPending}
            >
              {addCluesMutation.isPending ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      </PopWindow>

      <PopWindow
        isOpen={!!selectedManualClue}
        onClose={() => setSelectedManualClue(null)}
        hiddenScrollbar={true}
      >
        {renderDetailComponent()}
      </PopWindow>
    </div>
  );
}
