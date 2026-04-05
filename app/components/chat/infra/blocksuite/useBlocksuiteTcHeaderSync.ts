import { useEffect } from "react";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";
import type { BlocksuiteFrameToHostPayload } from "@/components/chat/infra/blocksuite/shared/frameProtocol";

import type { BlocksuiteEditorHandle, BlocksuiteTcHeaderState } from "./blocksuiteRuntimeTypes";

export function syncBlocksuiteTcHeaderState(params: {
  tcHeaderEnabled: boolean;
  tcHeaderState: BlocksuiteTcHeaderState;
  docId: string;
  workspaceId: string;
  editorHandle: BlocksuiteEditorHandle;
  postToParent: (payload: BlocksuiteFrameToHostPayload) => boolean;
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

  const payload: Extract<BlocksuiteFrameToHostPayload, { type: "tc-header" }> = {
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
  editorHandle: BlocksuiteEditorHandle;
  postToParent: (payload: BlocksuiteFrameToHostPayload) => boolean;
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
      editorHandle,
      postToParent,
      onTcHeaderChange,
      tcHeaderEntity,
      shouldPostToParent,
    });
  }, [
    docId,
    editorHandle,
    onTcHeaderChange,
    postToParent,
    shouldPostToParent,
    tcHeaderEnabled,
    tcHeaderEntity,
    tcHeaderState,
    workspaceId,
  ]);
}
