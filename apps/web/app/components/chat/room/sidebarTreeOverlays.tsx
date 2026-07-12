import { TrashSimpleIcon } from "@phosphor-icons/react";
import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/common/Button";
import { TextInput } from "@/components/common/FormField";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DialogActions, DialogFrame } from "@/components/common/DialogFrame";
import { MenuItem, MenuSurface } from "@/components/common/MenuPopover";

import { clampFloatingMenuPosition } from "./floatingMenuPosition";

export type CategoryEditorState = {
  mode: "add" | "rename";
  categoryId?: string;
  name: string;
}

export type SidebarTreeContextMenuState
  = | { kind: "category"; x: number; y: number; categoryId: string }
    | { kind: "doc"; x: number; y: number; categoryId: string; index: number; docId: string }
    | null;

export type DeleteConfirmDocState = {
  docId: string;
  title: string;
  categoryId: string;
  index: number;
}

type SidebarTreeOverlaysProps = {
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
    const nextPosition = clampFloatingMenuPosition(
      { x: contextMenu.x, y: contextMenu.y },
      {
        width: el.offsetWidth || el.getBoundingClientRect().width,
        height: el.offsetHeight || el.getBoundingClientRect().height,
      },
      {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    );
    el.style.position = "fixed";
    el.style.left = `${nextPosition.x}px`;
    el.style.top = `${nextPosition.y}px`;
  }, [contextMenu]);

  return (
    <>
      {categoryEditor && renderOverlay(
        <DialogFrame
          open
          mode="inline"
          onClose={onCloseCategoryEditor}
          ariaLabel={categoryEditor.mode === "add" ? "新增分类" : "重命名分类"}
          closeButtonLabel="关闭分类编辑弹窗"
          rootClassName="z-9999"
        >
            <h3 className="font-bold text-lg">
              {categoryEditor.mode === "add" ? "新增分类" : "重命名分类"}
            </h3>
            <div className="py-4 space-y-2">
              <TextInput
                className="w-full"
                autoComplete="off"
                aria-label="分类名称"
                value={categoryEditor.name}
                onChange={(e) => {
                  onCategoryEditorNameChange(e.target.value);
                }}
                placeholder="请输入分类名称"

              />
              {categoryEditorError && (
                <div className="text-error text-sm">{categoryEditorError}</div>
              )}
            </div>
            <DialogActions>
              <Button onClick={onCloseCategoryEditor}>取消</Button>
              <Button variant="primary" onClick={onSubmitCategoryEditor}>确定</Button>
            </DialogActions>
        </DialogFrame>,
      )}

      <ConfirmDialog
        open={deleteConfirmCategoryId !== null}
        onOpenChange={(open) => {
          if (!open)
            onCloseDeleteConfirmCategory();
        }}
        onConfirm={() => {
          if (deleteConfirmCategoryId)
            onConfirmDeleteCategory(deleteConfirmCategoryId);
        }}
        title="删除分类"
        description="删除分类会把其中的频道移动到相邻分类。"
        confirmLabel="删除"
        cancelLabel="取消"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />

      {contextMenu && renderOverlay(
        <div className="fixed inset-0 z-9999">
          <button
            type="button"
            className="absolute inset-0"
            onClick={onCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              onCloseContextMenu();
            }}
            aria-label="关闭侧边栏上下文菜单"
          />
          <MenuSurface
            as="ul"
            ariaLabel="侧边栏操作"
            ref={contextMenuRef}
            className="
              relative w-48 border border-base-300 p-2 shadow-xl
            "
            onMouseDown={e => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {contextMenu.kind === "category" && (
              <>
                <li role="none">
                  <MenuItem
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onOpenRenameCategory(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                  >
                    重命名
                  </MenuItem>
                </li>
                <li role="none">
                  <MenuItem
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onOpenAddPanel(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                  >
                    添加节点…
                  </MenuItem>
                </li>
                <li role="none">
                  <MenuItem
                    tone="danger"
                    onClick={() => {
                      if (!canEdit)
                        return;
                      onRequestDeleteConfirmCategory(contextMenu.categoryId);
                      onCloseContextMenu();
                    }}
                    disabled={treeCategoryCount <= 1}
                  >
                    删除分类
                  </MenuItem>
                </li>
              </>
            )}

            {contextMenu.kind === "doc" && (
              <>
                <li role="none">
                  <MenuItem
                    onClick={() => {
                      onOpenDoc(contextMenu.docId);
                      onCloseContextMenu();
                    }}
                  >
                    打开文档
                  </MenuItem>
                </li>
                {canEdit && (
                  <li role="none">
                    <MenuItem
                      tone="danger"
                      onClick={() => {
                        const title = getDocTitle(contextMenu.docId);
                        onRequestDeleteDoc(contextMenu.docId, title, contextMenu.categoryId, contextMenu.index);
                        onCloseContextMenu();
                      }}
                    >
                      删除文档…
                    </MenuItem>
                  </li>
                )}
              </>
            )}
          </MenuSurface>
        </div>,
      )}

      <ConfirmDialog
        open={deleteConfirmDoc !== null}
        onOpenChange={(open) => {
          if (!open)
            onCloseDeleteConfirmDoc();
        }}
        onConfirm={() => {
          if (deleteConfirmDoc)
            onConfirmDeleteDoc(deleteConfirmDoc);
        }}
        title="确认删除文档？"
        description={deleteConfirmDoc
          ? (
              <>
                将删除文档“
                {deleteConfirmDoc.title}
                ”，并从侧边栏移除。
                <br />
                该操作不可恢复。
              </>
            )
          : undefined}
        confirmLabel="删除"
        cancelLabel="取消"
        icon={<TrashSimpleIcon className="size-6" weight="regular" />}
        variant="danger"
      />
    </>
  );
}
