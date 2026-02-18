import { useCallback } from "react";
import { toast } from "react-hot-toast";

import type { FigurePosition } from "@/types/voiceRenderTypes";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

import { useAddRoomRoleMutation } from "../../../../api/hooks/chatQueryHooks";

type ImportChatItem = {
  roleId: number;
  content: string;
  speakerName?: string;
  figurePosition?: Exclude<FigurePosition, undefined>;
};

type UseRoomOverlaysControllerParams = {
  roomId: number;
  handleImportChatText: (
    items: Array<{
      roleId: number;
      content: string;
      speakerName?: string;
      figurePosition?: Exclude<FigurePosition, undefined>;
    }>,
    onProgress?: (sent: number, total: number) => void,
  ) => Promise<void>;
};

type UseRoomOverlaysControllerResult = {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (isOpen: boolean) => void;
  isNpcRoleHandleOpen: boolean;
  setIsNpcRoleAddWindowOpen: (isOpen: boolean) => void;
  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (isOpen: boolean) => void;
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
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);
  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const [isNpcRoleHandleOpen, setIsNpcRoleAddWindowOpen] = useSearchParamsState<boolean>("npcRoleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = useCallback(async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加角色成功"); },
    });
  }, [addRoleMutation, roomId]);

  const handleAddNpcRole = useCallback(async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加NPC成功"); },
    });
  }, [addRoleMutation, roomId]);

  const handleImportChatItems = useCallback(async (
    items: ImportChatItem[],
    onProgress?: (sent: number, total: number) => void,
  ) => {
    await handleImportChatText(items.map(i => ({
      roleId: i.roleId,
      content: i.content,
      speakerName: i.speakerName,
      figurePosition: i.figurePosition as Exclude<FigurePosition, undefined> | undefined,
    })), onProgress);
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
    isRenderWindowOpen,
    setIsRenderWindowOpen,
    handleAddRole,
    handleAddNpcRole,
    handleImportChatItems,
    openRoleAddWindow,
    openNpcAddWindow,
  };
}
