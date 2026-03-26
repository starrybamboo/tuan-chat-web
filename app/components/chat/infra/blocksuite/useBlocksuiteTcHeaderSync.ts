import { useEffect } from "react";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

import type { BlocksuiteEditorHandle, BlocksuiteTcHeaderState } from "./blocksuiteRuntimeTypes";

export function syncBlocksuiteTcHeaderState(params: {
  tcHeaderEnabled: boolean;
  tcHeaderState: BlocksuiteTcHeaderState;
  docId: string;
  workspaceId: string;
  instanceId?: string;
  editorHandle: BlocksuiteEditorHandle;
  postToParent: (payload: any) => boolean;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  tcHeaderEntity: {
    entityType: DescriptionEntityType;
    entityId?: number;
  } | null;
  shouldPostToParent: boolean;
}) {
  const {
    tcHeaderEnabled,
    tcHeaderState,
    docId,
    workspaceId,
    instanceId,
    editorHandle,
    postToParent,
    onTcHeaderChange,
    tcHeaderEntity,
    shouldPostToParent,
  } = params;

  if (!tcHeaderEnabled || !tcHeaderState)
    return false;
  if (tcHeaderState.docId !== docId)
    return false;

  const runtime = editorHandle.runtimeRef.current;
  runtime?.ensureDocMeta?.({ workspaceId, docId, title: tcHeaderState.header.title });

  const payload = {
    tc: "tc-blocksuite-frame",
    instanceId,
    type: "tc-header",
    docId,
    entityType: tcHeaderEntity?.entityType,
    entityId: tcHeaderEntity?.entityId,
    header: tcHeaderState.header,
  };

  if (shouldPostToParent) {
    postToParent(payload);
  }

  onTcHeaderChange?.({
    docId,
    entityType: tcHeaderEntity?.entityType,
    entityId: tcHeaderEntity?.entityId,
    header: tcHeaderState.header,
  });

  return true;
}

export function useBlocksuiteTcHeaderSync(params: {
  tcHeaderEnabled: boolean;
  tcHeaderState: BlocksuiteTcHeaderState;
  docId: string;
  workspaceId: string;
  instanceId?: string;
  editorHandle: BlocksuiteEditorHandle;
  postToParent: (payload: any) => boolean;
  onTcHeaderChange?: (payload: {
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }) => void;
  tcHeaderEntity: {
    entityType: DescriptionEntityType;
    entityId?: number;
  } | null;
  shouldPostToParent: boolean;
}) {
  const {
    tcHeaderEnabled,
    tcHeaderState,
    docId,
    workspaceId,
    instanceId,
    editorHandle,
    postToParent,
    onTcHeaderChange,
    tcHeaderEntity,
    shouldPostToParent,
  } = params;

  useEffect(() => {
    syncBlocksuiteTcHeaderState({
      tcHeaderEnabled,
      tcHeaderState,
      docId,
      workspaceId,
      instanceId,
      editorHandle,
      postToParent,
      onTcHeaderChange,
      tcHeaderEntity,
      shouldPostToParent,
    });
  }, [
    docId,
    editorHandle,
    instanceId,
    onTcHeaderChange,
    postToParent,
    shouldPostToParent,
    tcHeaderEnabled,
    tcHeaderEntity,
    tcHeaderState,
    workspaceId,
  ]);
}
