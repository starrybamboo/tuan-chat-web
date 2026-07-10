import { useCallback } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { ImportChatRequestMessage } from "@/components/chat/utils/importChatMessageRequestBuilder";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

import { useAddRoomRoleMutation } from "../../../../api/hooks/chatQueryHooks";

type ImportChatItem = ImportChatRequestMessage;

type UseRoomOverlaysControllerParams = {
  roomId: number;
  handleImportChatText: (items: ImportChatRequestMessage[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
};

type UseRoomOverlaysControllerResult = {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (isOpen: boolean) => void;
  isNpcRoleHandleOpen: boolean;
  setIsNpcRoleAddWindowOpen: (isOpen: boolean) => void;
  handleAddRole: (roleId: number) => Promise<void> | void;
  handleAddNpcRole: (roleId: number) => Promise<void> | void;
  handleImportChatItems: (items: ImportChatItem[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  openRoleAddWindow: () => void;
  openNpcAddWindow: () => void;
};

export default function useRoomOverlaysController({
  roomId,
  handleImportChatText,
}: UseRoomOverlaysControllerParams): UseRoomOverlaysControllerResult {
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);
  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const [isNpcRoleHandleOpen, setIsNpcRoleAddWindowOpen] = useSearchParamsState<boolean>("npcRoleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = useCallback(async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { appToast.info("添加角色成功"); },
    });
  }, [addRoleMutation, roomId]);

  const handleAddNpcRole = useCallback(async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { appToast.info("添加NPC成功"); },
    });
  }, [addRoleMutation, roomId]);

  const handleImportChatItems = useCallback(async (
    items: ImportChatItem[],
    onProgress?: (sent: number, total: number) => void,
  ) => {
    await handleImportChatText(items, onProgress);
  }, [handleImportChatText]);

  const openRoleAddWindow = useCallback(() => {
    setIsRoleAddWindowOpen(true);
  }, [setIsRoleAddWindowOpen]);

  const openNpcAddWindow = useCallback(() => {
    setIsNpcRoleAddWindowOpen(true);
  }, [setIsNpcRoleAddWindowOpen]);

  return {
    isImportChatTextOpen,
    setIsImportChatTextOpen,
    isRoleHandleOpen,
    setIsRoleAddWindowOpen,
    isNpcRoleHandleOpen,
    setIsNpcRoleAddWindowOpen,
    handleAddRole,
    handleAddNpcRole,
    handleImportChatItems,
    openRoleAddWindow,
    openNpcAddWindow,
  };
}
