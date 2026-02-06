import { useCallback } from "react";
import { toast } from "react-hot-toast";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";

import { useAddRoomRoleMutation } from "../../../../api/hooks/chatQueryHooks";

type ImportChatItem = {
  roleId: number;
  content: string;
  speakerName?: string;
  figurePosition?: string;
};

type UseRoomOverlaysControllerParams = {
  roomId: number;
  handleImportChatText: (
    items: Array<{
      roleId: number;
      content: string;
      speakerName?: string;
      figurePosition?: "left" | "center" | "right";
    }>,
    onProgress?: (sent: number, total: number) => void,
  ) => Promise<void>;
};

type UseRoomOverlaysControllerResult = {
  isImportChatTextOpen: boolean;
  setIsImportChatTextOpen: (isOpen: boolean) => void;
  isRoleHandleOpen: boolean;
  setIsRoleAddWindowOpen: (isOpen: boolean) => void;
  isRenderWindowOpen: boolean;
  setIsRenderWindowOpen: (isOpen: boolean) => void;
  handleAddRole: (roleId: number) => Promise<void> | void;
  handleImportChatItems: (items: ImportChatItem[], onProgress?: (sent: number, total: number) => void) => Promise<void>;
  openRoleAddWindow: () => void;
};

export default function useRoomOverlaysController({
  roomId,
  handleImportChatText,
}: UseRoomOverlaysControllerParams): UseRoomOverlaysControllerResult {
  const [isRenderWindowOpen, setIsRenderWindowOpen] = useSearchParamsState<boolean>("renderPop", false);
  const [isImportChatTextOpen, setIsImportChatTextOpen] = useSearchParamsState<boolean>("importChatTextPop", false);
  const [isRoleHandleOpen, setIsRoleAddWindowOpen] = useSearchParamsState<boolean>("roleAddPop", false);
  const addRoleMutation = useAddRoomRoleMutation();

  const handleAddRole = useCallback(async (roleId: number) => {
    addRoleMutation.mutate({ roomId, roleIdList: [roleId] }, {
      onSettled: () => { toast("添加角色成功"); },
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
      figurePosition: i.figurePosition as "left" | "center" | "right" | undefined,
    })), onProgress);
  }, [handleImportChatText]);

  const openRoleAddWindow = useCallback(() => {
    setIsRoleAddWindowOpen(true);
  }, [setIsRoleAddWindowOpen]);

  return {
    isImportChatTextOpen,
    setIsImportChatTextOpen,
    isRoleHandleOpen,
    setIsRoleAddWindowOpen,
    isRenderWindowOpen,
    setIsRenderWindowOpen,
    handleAddRole,
    handleImportChatItems,
    openRoleAddWindow,
  };
}
