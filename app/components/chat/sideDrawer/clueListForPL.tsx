import type { SpaceClueCreateRequest } from "api";
import type { ClueMessage } from "api/models/ClueMessage";
import ConfirmModal from "@/components/common/comfirmModel";
import { PopWindow } from "@/components/common/popWindow";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import {
  useAddCluesMutation,
  useCreateClueStarsBatchMutation,
  useDeleteCluesMutation,
  useDeleteClueStarsMutation,
  useGetCluesByClueStarsQuery,
  useGetMyClueStarsBySpaceQuery,
  useUpdateClueStarsMutation,
} from "api/hooks/spaceClueHooks";
import { use, useMemo, useState } from "react";
import toast from "react-hot-toast";
import QuillEditor from "../../common/quillEditor/quillEditor";
import DisplayOfItemDetail from "../displayOfItemsDetail";
import { RoomContext } from "../roomContext";

export default function ClueListForPL({ onSend }: { onSend: (clue: ClueMessage) => void }) {
  const { spaceId } = use(RoomContext);

  // 获取用户空间所有文件夹
  const getMyClueStarsBySpaceQuery = useGetMyClueStarsBySpaceQuery(spaceId ?? -1);
  const clueFolders = useMemo(() => getMyClueStarsBySpaceQuery.data?.data ?? [], [getMyClueStarsBySpaceQuery.data?.data]);

  // 当前选中的线索夹（用于添加线索时选择）
  const [selectedFolderId, setSelectedFolderId] = useState<number>(-1);

  // 获取当前选中线索夹下的线索
  const getCluesByClueStarsQuery = useGetCluesByClueStarsQuery(selectedFolderId > 0 ? selectedFolderId : -1);
  const clues = useMemo(() => getCluesByClueStarsQuery.data?.data ?? [], [getCluesByClueStarsQuery.data?.data]);

  // 添加线索
  const addCluesMutation = useAddCluesMutation();
  // 删除线索
  const deleteCluesMutation = useDeleteCluesMutation();
  // 创建线索夹
  const createClueStarsBatchMutation = useCreateClueStarsBatchMutation(spaceId ?? -1);
  // 删除线索夹
  const deleteClueStarsMutation = useDeleteClueStarsMutation(spaceId ?? -1);
  // 更新线索夹
  const updateClueStarsMutation = useUpdateClueStarsMutation(spaceId ?? -1);

  const [selectedManualClue, setSelectedManualClue] = useState<any>(null);
  const [clueToDelete, setClueToDelete] = useState<{ id: number; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: number; name: string } | null>(null);

  const [editingFolder, setEditingFolder] = useState<{ id: number; name: string } | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const handleSend = (clue: ClueMessage) => {
    onSend(clue);
    setSelectedManualClue(null);
    toast("发送成功");
  };

  const handleClueUpdate = () => {
    getCluesByClueStarsQuery.refetch();
    toast.success("线索更新成功");
  };

  // 添加线索表单状态
  const [showAddClue, setShowAddClue] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [newClue, setNewClue] = useState({
    name: "",
    description: "",
    image: "",
    note: "",
    clueStarsId: selectedFolderId,
  });

  const [openFolderId, setOpenFolderId] = useState<number | null>(null);

  const toggleFolder = (folderId: number) => {
    setOpenFolderId(prev => (prev === folderId ? null : folderId));
    setSelectedFolderId(prev => (prev === folderId ? -1 : folderId));
  };

  // 编辑线索夹名称函数
  const handleStartEditFolder = (folderId: number, folderName: string) => {
    setEditingFolder({ id: folderId, name: folderName });
    setEditFolderName(folderName);
  };

  const handleCancelEditFolder = () => {
    setEditingFolder(null);
    setEditFolderName("");
  };

  const handleSaveFolderName = async () => {
    if (!editingFolder || !editFolderName.trim()) {
      toast.error("请输入有效的线索夹名称");
      return;
    }

    if (editFolderName === editingFolder.name) {
      setEditingFolder(null);
      setEditFolderName("");
      return;
    }

    // 检查名称是否重复
    if (clueFolders.some(folder => folder.name === editFolderName && folder.id !== editingFolder.id)) {
      toast.error("该名称的线索夹已存在");
      return;
    }

    try {
      const request = {
        id: editingFolder.id,
        name: editFolderName,
      };

      await updateClueStarsMutation.mutateAsync(request);

      toast.success("线索夹名称修改成功");
      setEditingFolder(null);
      setEditFolderName("");
      getMyClueStarsBySpaceQuery.refetch();
    }
    catch {
      toast.error("修改线索夹名称失败");
    }
  };

  // 处理查看线索详情
  const handleViewClue = (clue: any) => {
    setSelectedManualClue({
      id: clue.id,
      name: clue.name,
      description: clue.description,
      image: clue.image,
      note: clue.note,
      clueStarsId: clue.clueStarsId,
    });
  };

  const handleAddClue = async () => {
    if (!newClue.name.trim()) {
      toast.error("请输入线索名称");
      return;
    }

    if (!newClue.description.trim()) {
      toast.error("请输入线索描述");
      return;
    }

    if (newClue.clueStarsId === -1) {
      toast.error("请选择线索夹");
      return;
    }

    try {
      const request: Array<SpaceClueCreateRequest> = [
        {
          clueStarsId: newClue.clueStarsId,
          name: newClue.name,
          description: newClue.description,
          image: newClue.image,
          note: newClue.note,
        },
      ];

      await addCluesMutation.mutateAsync(request);

      toast.success("添加线索成功");
      setShowAddClue(false);
      setNewClue({
        name: "",
        description: "",
        image: "",
        note: "",
        clueStarsId: selectedFolderId,
      });
      getCluesByClueStarsQuery.refetch();
    }
    catch {
      toast.error("添加线索失败");
    }
  };

  const handleDeleteClue = async () => {
    if (!spaceId || !clueToDelete)
      return;

    try {
      await deleteCluesMutation.mutateAsync([clueToDelete.id]);
      toast.success("删除线索成功");
      setClueToDelete(null);
      getCluesByClueStarsQuery.refetch();
    }
    catch {
      toast.error("删除线索失败");
    }
  };

  // 创建新线索夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("请输入线索夹名称");
      return;
    }

    if (!spaceId) {
      toast.error("空间ID不存在");
      return;
    }

    if (clueFolders.some(folder => folder.name === newFolderName)) {
      toast.error("该名称的线索夹已存在");
      return;
    }

    try {
      const request = [
        {
          spaceId,
          name: newFolderName,
        },
      ];

      await createClueStarsBatchMutation.mutateAsync(request);

      toast.success("线索夹创建成功");
      setNewFolderName("");
      setShowFolderManager(false);
      getMyClueStarsBySpaceQuery.refetch();
    }
    catch {
      toast.error("创建线索夹失败");
    }
  };

  // 删除线索夹
  const handleDeleteFolder = async () => {
    if (!folderToDelete)
      return;

    try {
      await deleteClueStarsMutation.mutateAsync([folderToDelete.id]);
      toast.success("线索夹删除成功");
      setFolderToDelete(null);
      getMyClueStarsBySpaceQuery.refetch();
    }
    catch {
      toast.error("删除线索夹失败");
    }
  };

  const openDeleteConfirm = (clueId: number, clueName: string) => {
    setClueToDelete({ id: clueId, name: clueName });
  };

  const openDeleteFolderConfirm = (folderId: number, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
  };

  const closeDeleteConfirm = () => {
    setClueToDelete(null);
  };

  const closeDeleteFolderConfirm = () => {
    setFolderToDelete(null);
  };

  const handleInputChange = (field: string, value: string) => {
    setNewClue(prev => ({
      ...prev,
      [field]: field === "clueStarsId" ? Number(value) : value,
    }));
  };

  const renderDetailComponent = () => {
    if (!selectedManualClue)
      return null;

    return (
      <DisplayOfItemDetail
        manualData={selectedManualClue}
        onSend={handleSend}
        onUpdate={handleClueUpdate}
      />
    );
  };

  // 初始化选中第一个文件夹
  useMemo(() => {
    if (clueFolders.length > 0 && selectedFolderId === -1) {
      const firstFolder = clueFolders[0];
      setSelectedFolderId(firstFolder.id!);
      setNewClue(prev => ({ ...prev, clueStarsId: firstFolder.id! }));
    }
  }, [clueFolders, selectedFolderId]);

  const isLoading = getMyClueStarsBySpaceQuery.isLoading || getCluesByClueStarsQuery.isLoading;

  return (
    <div className="space-y-3 p-3 overflow-auto flex flex-col items-center">
      {/* 标题和操作按钮 */}
      <div className="flex justify-between items-center w-full max-w-64 gap-2">
        <span className="font-medium text-lg">持有线索</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setShowFolderManager(true)}
            className="btn btn-ghost btn-sm flex items-center gap-1"
            title="管理线索夹"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowAddClue(true)}
            className="btn btn-primary btn-sm flex items-center gap-1"
            disabled={clueFolders.length === 0}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加线索
          </button>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="w-full flex justify-center py-4">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      )}

      {/* 线索夹列表 */}
      <div className="w-full space-y-3">
        {!isLoading && clueFolders.length === 0
          ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p>暂无线索夹</p>
                <p className="text-sm mt-1">请先创建线索夹</p>
                <button
                  type="button"
                  onClick={() => setShowFolderManager(true)}
                  className="btn btn-primary btn-sm mt-3"
                >
                  创建线索夹
                </button>
              </div>
            )
          : (
              !isLoading && clueFolders.map((folder) => {
                const folderClues = clues.filter(clue => clue.clueStarsId === folder.id);
                const hasClues = folderClues.length > 0;

                return (
                  <div key={folder.id} className="w-full">
                    {/* 线索夹列表项 */}
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.id!)}
                      className="btn flex w-full max-w-64 mx-auto gap-3 p-3 bg-base-200 rounded-lg items-center hover:bg-base-300 transition border border-base-300"
                      aria-expanded={openFolderId === folder.id}
                      aria-controls={`clue-drawer-${folder.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <span className="truncate flex-1 text-left font-medium">
                        {folder.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <svg
                          className={`h-4 w-4 transform transition-transform flex-shrink-0 ${openFolderId === folder.id ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {openFolderId === folder.id && (
                      <div id={`clue-drawer-${folder.id}`} className="mt-2 ml-4 space-y-3">
                        {getCluesByClueStarsQuery.isLoading && (
                          <div className="flex justify-center py-2">
                            <div className="text-sm text-gray-500 flex items-center gap-2">
                              <div className="loading loading-spinner loading-xs"></div>
                              加载中...
                            </div>
                          </div>
                        )}
                        {getCluesByClueStarsQuery.isError && (
                          <div className="text-sm text-red-500 text-center">加载失败</div>
                        )}

                        {/* 无线索提示 */}
                        {!hasClues && !getCluesByClueStarsQuery.isLoading && (
                          <div className="text-center py-4 text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="text-sm">该线索夹暂无线索</p>
                          </div>
                        )}

                        {/* 线索列表 */}
                        {hasClues && (
                          <div className="space-y-2 animate-fade-in">
                            {folderClues.map(clue => (
                              <div
                                key={clue.id}
                                className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800 px-3 py-2 rounded-lg border border-base-300"
                              >
                                <div className="flex items-center gap-2">
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
                                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 max-w-24 truncate">
                                    {clue.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                    onClick={() => handleViewClue(clue)}
                                  >
                                    查看
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => openDeleteConfirm(clue.id!, clue.name ?? "")}
                                    disabled={deleteCluesMutation.isPending}
                                    title="删除线索"
                                  >
                                    {deleteCluesMutation.isPending ? "删除中..." : "删除"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
      </div>

      {/* 添加线索模态框 */}
      <PopWindow
        isOpen={showAddClue}
        onClose={() => setShowAddClue(false)}
      >
        <div className="max-w-2xl w-full mx-auto bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
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

          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                  线索夹
                </label>
                <select
                  value={newClue.clueStarsId}
                  onChange={e => handleInputChange("clueStarsId", e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={clueFolders.length === 0}
                >
                  {clueFolders.length === 0
                    ? (
                        <option value={-1}>暂无线索夹</option>
                      )
                    : (
                        clueFolders.map(folder => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))
                      )}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                描述 *
              </label>
              <QuillEditor
                id="add-clue-description"
                placeholder={newClue.description || "请输入线索描述"}
                onchange={val => handleInputChange("description", val)}
                height="small"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                笔记
              </label>
              <QuillEditor
                id="add-clue-note"
                placeholder={newClue.note || "请输入线索笔记"}
                onchange={val => handleInputChange("note", val)}
                height="small"
              />
            </div>
          </div>

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
              disabled={addCluesMutation.isPending || newClue.clueStarsId === -1}
            >
              {addCluesMutation.isPending ? "添加中..." : "确认添加"}
            </button>
          </div>
        </div>
      </PopWindow>

      {/* 线索夹管理模态框 */}
      <PopWindow
        isOpen={showFolderManager}
        onClose={() => setShowFolderManager(false)}
      >
        <div className="max-w-md w-full mx-auto bg-neutral-50 dark:bg-neutral-800 rounded-xl shadow-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
          <div className="p-5 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
              管理线索夹
            </h2>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="输入新线索夹名称"
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="btn btn-primary w-full"
                disabled={createClueStarsBatchMutation.isPending}
              >
                {createClueStarsBatchMutation.isPending ? "创建中..." : "创建线索夹"}
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <div className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-2">
                现有线索夹
              </div>
              {clueFolders.map(folder => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600"
                >
                  {editingFolder?.id === folder.id
                    ? (
                  // 编辑模式
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editFolderName}
                            onChange={e => setEditFolderName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-blue-300 rounded bg-white dark:bg-neutral-600 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveFolderName();
                              }
                              else if (e.key === "Escape") {
                                handleCancelEditFolder();
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={handleSaveFolderName}
                              className="btn btn-xs btn-success"
                              disabled={updateClueStarsMutation.isPending}
                            >
                              {updateClueStarsMutation.isPending ? "保存中..." : "保存"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditFolder}
                              className="btn btn-xs btn-ghost"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      )
                    : (
                  // 查看模式
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <div className="flex-1">
                              <div className="font-semibold text-blue-600 dark:text-blue-400">
                                {folder.name}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditFolder(folder.id!, folder.name ?? "")}
                              className="btn btn-ghost btn-xs text-info hover:bg-info hover:text-info-content"
                              title="编辑名称"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteFolderConfirm(folder.id!, folder.name ?? "")}
                              className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
                            >
                              删除
                            </button>
                          </div>
                        </>
                      )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
            <button
              type="button"
              className="btn btn-ghost px-4 py-2"
              onClick={() => setShowFolderManager(false)}
            >
              关闭
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

      {/* 删除线索确认模态框 */}
      <ConfirmModal
        isOpen={!!clueToDelete}
        onClose={closeDeleteConfirm}
        title="确认删除线索"
        message={`确定要删除线索 "${clueToDelete?.name}" 吗？此操作不可恢复。`}
        onConfirm={handleDeleteClue}
        confirmText={deleteCluesMutation.isPending ? "删除中..." : "确认删除"}
        cancelText="取消"
        variant="danger"
      />

      {/* 删除线索夹确认模态框 */}
      <ConfirmModal
        isOpen={!!folderToDelete}
        onClose={closeDeleteFolderConfirm}
        title="确认删除线索夹"
        message={`确定要删除线索夹 "${folderToDelete?.name}" 吗？此操作不可恢复，且会删除该线索夹下的所有线索。`}
        onConfirm={handleDeleteFolder}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />
    </div>
  );
}
