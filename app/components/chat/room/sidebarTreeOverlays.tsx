import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface CategoryEditorState {
  mode: "add" | "rename";
  categoryId?: string;
  name: string;
}

export type SidebarTreeContextMenuState
  = | { kind: "category"; x: number; y: number; categoryId: string }
    | { kind: "doc"; x: number; y: number; categoryId: string; index: number; docId: string }
    | null;

export interface DeleteConfirmDocState {
  docId: string;
  title: string;
  categoryId: string;
  index: number;
}

export interface SidebarTreeOverlaysProps {
  canEdit: boolean;

  // category editor modal
  categoryEditor: CategoryEditorState | null;
  categoryEditorError: string;
  onCategoryEditorNameChange: (name: string) => void;
  onCloseCategoryEditor: () => void;
  onSubmitCategoryEditor: () => void;

  // delete category confirm modal
  deleteConfirmCategoryId: string | null;
  treeCategoryCount: number;
  onCloseDeleteConfirmCategory: () => void;
  onRequestDeleteConfirmCategory: (categoryId: string) => void;
  onConfirmDeleteCategory: (categoryId: string) => void;

  // context menu (category/doc)
  contextMenu: SidebarTreeContextMenuState;
  onCloseContextMenu: () => void;
  onOpenRenameCategory: (categoryId: string) => void;
  onOpenAddPanel: (categoryId: string) => void;

  onOpenDoc: (docId: string) => void;
  onRequestDeleteDoc: (docId: string, title: string, categoryId: string, index: number) => void;

  // delete doc confirm modal
  deleteConfirmDoc: DeleteConfirmDocState | null;
  onCloseDeleteConfirmDoc: () => void;
  onConfirmDeleteDoc: (payload: DeleteConfirmDocState) => void;

  // doc title resolver for menu actions
  getDocTitle: (docId: string) => string;
}

export default function SidebarTreeOverlays(props: SidebarTreeOverlaysProps) {
  const {
    canEdit,
    categoryEditor,
    categoryEditorError,
    onCategoryEditorNameChange,
    onCloseCategoryEditor,
    onSubmitCategoryEditor,
    deleteConfirmCategoryId,
    treeCategoryCount,
    onCloseDeleteConfirmCategory,
    onRequestDeleteConfirmCategory,
    onConfirmDeleteCategory,
    contextMenu,
    onCloseContextMenu,
    onOpenRenameCategory,
    onOpenAddPanel,
    onOpenDoc,
    onRequestDeleteDoc,
    deleteConfirmDoc,
    onCloseDeleteConfirmDoc,
    onConfirmDeleteDoc,
    getDocTitle,
  } = props;

  const renderOverlay = useCallback((node: React.ReactNode) => {
    if (typeof document === "undefined")
      return null;
    return createPortal(node, document.body);
  }, []);

  const contextMenuRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (!contextMenu)
      return;
    const close = () => onCloseContextMenu();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [contextMenu, onCloseContextMenu]);

  useEffect(() => {
    if (!contextMenu)
      return;
    const el = contextMenuRef.current;
    if (!el)
      return;
    el.style.position = "fixed";
    el.style.left = `${contextMenu.x}px`;
    el.style.top = `${contextMenu.y}px`;
  }, [contextMenu]);

  return (
    <>
      {categoryEditor && renderOverlay(
        <div className="modal modal-open z-[9999]">
          <div className="modal-box">
            <h3 className="font-bold text-lg">
              {categoryEditor.mode === "add" ? "新增分类" : "重命名分类"}
            </h3>
            <div className="py-4 space-y-2">
              <input
                className="input input-bordered w-full"
                value={categoryEditor.name}
                onChange={(e) => {
                  onCategoryEditorNameChange(e.target.value);
                }}
                placeholder="请输入分类名称"
                autoFocus
              />
              {categoryEditorError && (
                <div className="text-error text-sm">{categoryEditorError}</div>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={onCloseCategoryEditor}>取消</button>
              <button type="button" className="btn btn-primary" onClick={onSubmitCategoryEditor}>确定</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={onCloseCategoryEditor} />
        </div>,
      )}

      {deleteConfirmCategoryId && renderOverlay(
        <div className="modal modal-open z-[9999]">
          <div className="modal-box">
            <h3 className="font-bold text-lg">删除分类</h3>
            <div className="py-4 text-sm opacity-80">
              删除分类会把其中的频道移动到相邻分类。
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={onCloseDeleteConfirmCategory}>取消</button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => onConfirmDeleteCategory(deleteConfirmCategoryId)}
              >
                删除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={onCloseDeleteConfirmCategory} />
        </div>,
      )}

      {contextMenu && renderOverlay(
        <div
          className="fixed inset-0 z-[9999]"
          onClick={onCloseContextMenu}
          onContextMenu={(e) => {
            e.preventDefault();
            onCloseContextMenu();
          }}
        >
          <ul
            ref={contextMenuRef}
            className="menu bg-base-100 rounded-box shadow-xl border border-base-300 w-48 p-2"
            onClick={e => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {contextMenu.kind === "category" && (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onOpenRenameCategory(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                  >
                    重命名
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onOpenAddPanel(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                  >
                    添加频道…
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="text-error"
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onRequestDeleteConfirmCategory(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                    disabled={treeCategoryCount <= 1}
                  >
                    删除分类
                  </button>
                </li>
              </>
            )}

            {contextMenu.kind === "doc" && (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDoc(contextMenu.docId);
                      onCloseContextMenu();
                    }}
                  >
                    打开文档
                  </button>
                </li>
                {canEdit && (
                  <li>
                    <button
                      type="button"
                      className="text-error"
                      onClick={() => {
                        const title = getDocTitle(contextMenu.docId);
                        onRequestDeleteDoc(contextMenu.docId, title, contextMenu.categoryId, contextMenu.index);
                        onCloseContextMenu();
                      }}
                    >
                      删除文档…
                    </button>
                  </li>
                )}
              </>
            )}
          </ul>
        </div>,
      )}

      {deleteConfirmDoc && renderOverlay(
        <div className="modal modal-open z-[9999]">
          <div className="modal-box">
            <h3 className="font-bold text-lg">确认删除文档？</h3>
            <p className="py-4">
              将删除文档“
              {deleteConfirmDoc.title}
              ”，并从侧边栏移除。
              <br />
              该操作不可恢复。
            </p>
            <div className="modal-action">
              <button type="button" className="btn" onClick={onCloseDeleteConfirmDoc}>取消</button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => {
                  onConfirmDeleteDoc(deleteConfirmDoc);
                }}
              >
                删除
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={onCloseDeleteConfirmDoc} />
        </div>,
      )}
    </>
  );
}
