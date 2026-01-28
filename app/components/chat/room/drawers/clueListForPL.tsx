import type { ClueMessage } from "../../../../../api/models/ClueMessage";
import { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { RoomContext } from "@/components/chat/core/roomContext";
import ConfirmModal from "@/components/common/comfirmModel";
import { PopWindow } from "@/components/common/popWindow";
import {
  useCreateClueStarsBatchMutation,
  useDeleteCluesMutation,
  useDeleteClueStarsMutation,
  useGetCluesByClueStarsQuery,
  useGetMyClueStarsBySpaceQuery,
  useUpdateClueStarsMutation,
} from "../../../../../api/hooks/spaceClueHooks";
import DisplayOfItemDetail from "../../message/items/displayOfItemsDetail";

export default function ClueListForPL({ onSend }: { onSend: (clue: ClueMessage) => void }) {
  const { spaceId } = use(RoomContext);

  const getMyClueStarsBySpaceQuery = useGetMyClueStarsBySpaceQuery(spaceId ?? -1);
  const clueFolders = useMemo(() => getMyClueStarsBySpaceQuery.data?.data ?? [], [getMyClueStarsBySpaceQuery.data?.data]);

  const [selectedFolderId, setSelectedFolderId] = useState<number>(-1);

  const getCluesByClueStarsQuery = useGetCluesByClueStarsQuery(selectedFolderId > 0 ? selectedFolderId : -1);
  const cluesFromQuery = useMemo(() => getCluesByClueStarsQuery.data?.data ?? [], [getCluesByClueStarsQuery.data?.data]);

  const [clues, setClues] = useState<any[]>([]);
  useEffect(() => {
    setClues(cluesFromQuery as any[]);
  }, [cluesFromQuery]);

  const deleteCluesMutation = useDeleteCluesMutation();
  const createClueStarsBatchMutation = useCreateClueStarsBatchMutation(spaceId ?? -1);
  const deleteClueStarsMutation = useDeleteClueStarsMutation(spaceId ?? -1);
  const updateClueStarsMutation = useUpdateClueStarsMutation(spaceId ?? -1);

  const [selectedManualClue, setSelectedManualClue] = useState<any>(null);
  const [isClueDetailOpen, setIsClueDetailOpen] = useState(false);
  const [clueToDelete, setClueToDelete] = useState<{ id: number; name: string } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<{ id: number; name: string } | null>(null);

  const [editingFolder, setEditingFolder] = useState<{ id: number; name: string } | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const handleSend = (clue: ClueMessage) => {
    onSend(clue);
    setSelectedManualClue(null);
    toast("发送成功");
  };

  const [showFolderManager, setShowFolderManager] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [openFolderId, setOpenFolderId] = useState<number | null>(null);

  const toggleFolder = (folderId: number) => {
    setOpenFolderId(prev => (prev === folderId ? null : folderId));
    setSelectedFolderId(prev => (prev === folderId ? -1 : folderId));
  };

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

  const handleViewClue = (clue: any) => {
    setSelectedManualClue(clue);
    setIsClueDetailOpen(true);
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

  const renderDetailComponent = () => {
    if (!selectedManualClue)
      return null;

    return (
      <DisplayOfItemDetail
        manualData={selectedManualClue}
        spaceId={spaceId ?? undefined}
        onSend={handleSend}
        onManualDataChange={(next) => {
          setSelectedManualClue((prev: any) => ({ ...(prev ?? {}), ...(next ?? {}) }));

          const id = (next as any)?.id;
          if (typeof id !== "number" || !Number.isFinite(id))
            return;

          setClues((prev) => {
            if (!Array.isArray(prev))
              return prev;
            const idx = prev.findIndex((c: any) => c?.id === id);
            if (idx < 0)
              return prev;
            const updated = { ...prev[idx], ...(next ?? {}) };
            const nextArr = [...prev];
            nextArr[idx] = updated;
            return nextArr;
          });
        }}
      />
    );
  };

  useMemo(() => {
    if (clueFolders.length > 0 && selectedFolderId === -1) {
      const firstFolder = clueFolders[0];
      setSelectedFolderId(firstFolder.id!);
    }
  }, [clueFolders, selectedFolderId]);

  const isLoading = getMyClueStarsBySpaceQuery.isLoading || getCluesByClueStarsQuery.isLoading;

  return (
    <div className="space-y-3 p-3 overflow-auto flex flex-col w-full items-stretch">
      <div className="flex justify-between items-center w-full gap-2">
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
            onClick={() => setIsDeleteMode(prev => !prev)}
            className={[
              "btn btn-sm flex items-center gap-1 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isDeleteMode
                ? "btn-error text-error-content"
                : "btn-ghost border border-base-300",
            ].join(" ")}
            disabled={clueFolders.length === 0}
            aria-pressed={isDeleteMode}
            title={isDeleteMode ? "删除模式已开启：点击关闭" : "删除模式已关闭：点击开启"}
          >
            删除线索
          </button>
        </div>
      </div>

      {isDeleteMode && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200 px-3 py-2 text-sm">
          删除模式已开启：点击每条线索的“删除”进行删除操作。
        </div>
      )}

      {isLoading && (
        <div className="w-full flex justify-center py-4">
          <div className="loading loading-spinner loading-md"></div>
        </div>
      )}

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
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.id!)}
                      className="btn flex w-full gap-3 p-3 bg-base-200 rounded-lg items-center hover:bg-base-300 transition border border-base-300"
                      aria-expanded={openFolderId === folder.id}
                      aria-controls={`clue-drawer-${folder.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                      </div>
                      <span className="truncate flex-1 text-left font-medium">
                        {folder.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <svg
                          className={`h-4 w-4 transform transition-transform shrink-0 ${openFolderId === folder.id ? "rotate-180" : ""}`}
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

                        {!hasClues && !getCluesByClueStarsQuery.isLoading && (
                          <div className="text-center py-4 text-gray-500">
                            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="text-sm">该线索夹暂无线索</p>
                          </div>
                        )}

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
                                          className="w-6 h-6 rounded-full object-cover shrink-0"
                                        />
                                      )
                                    : (
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
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
                                  {isDeleteMode
                                    ? (
                                        <button
                                          type="button"
                                          className="btn btn-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => {
                                            openDeleteConfirm(clue.id!, clue.name ?? "");
                                          }}
                                          disabled={deleteCluesMutation.isPending}
                                        >
                                          删除
                                        </button>
                                      )
                                    : (
                                        <button
                                          type="button"
                                          className="btn btn-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          onClick={() => {
                                            if (isDeleteMode) {
                                              openDeleteConfirm(clue.id!, clue.name ?? "");
                                              return;
                                            }

                                            const clueMessage: ClueMessage = {
                                              img: clue.image ?? "",
                                              name: clue.name ?? "未命名线索",
                                              description: "（富文本线索）",
                                            };
                                            handleSend(clueMessage);
                                            toast.success("已公布");
                                          }}
                                          disabled={deleteCluesMutation.isPending}
                                        >
                                          公布
                                        </button>
                                      )}
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
        isOpen={isClueDetailOpen}
        onClose={() => {
          setIsClueDetailOpen(false);
          setSelectedManualClue(null);
        }}
        fullScreen={false}
        hiddenScrollbar={true}
      >
        <div className="w-[50vw] lg:w-[60vw] max-w-none">
          {renderDetailComponent()}
        </div>
      </PopWindow>

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
