import { useCallback, useState } from "react";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { useAddRoomMemberMutation, useAddSpaceMemberMutation, useSetPlayerMutation } from "api/hooks/chatQueryHooks";

type SpaceMemberSummary = {
  userId?: number | null;
};

type UseChatPageMemberActionsParams = {
  activeSpaceId?: number | null;
  spaceMembers: SpaceMemberSummary[];
};

type UseChatPageMemberActionsResult = {
  handleAddRoomMember: (userId: number) => void;
  handleAddSpaceMember: (userId: number) => void;
  handleAddSpacePlayer: (userId: number) => void;
  handleInvitePlayer: (roomId: number) => void;
  inviteRoomId: number | null;
  isMemberHandleOpen: boolean;
  setInviteRoomId: (roomId: number | null) => void;
  setIsMemberHandleOpen: (next: boolean) => void;
};

export default function useChatPageMemberActions({
  activeSpaceId,
  spaceMembers,
}: UseChatPageMemberActionsParams): UseChatPageMemberActionsResult {
  const [isMemberHandleOpen, setIsMemberHandleOpen] = useSearchParamsState<boolean>("addSpaceMemberPop", false);
  const [inviteRoomId, setInviteRoomId] = useState<number | null>(null);

  const addRoomMemberMutation = useAddRoomMemberMutation();
  const addSpaceMemberMutation = useAddSpaceMemberMutation();
  const setPlayerMutation = useSetPlayerMutation();

  const handleInvitePlayer = useCallback((roomId: number) => {
    setInviteRoomId(roomId);
  }, []);

  const handleAddRoomMember = useCallback((userId: number) => {
    if (!inviteRoomId)
      return;
    addRoomMemberMutation.mutate({
      roomId: inviteRoomId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        setInviteRoomId(null);
      },
    });
  }, [addRoomMemberMutation, inviteRoomId]);

  const handleAddSpaceMember = useCallback((userId: number) => {
    if (!activeSpaceId)
      return;
    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        setIsMemberHandleOpen(false);
      },
    });
  }, [activeSpaceId, addSpaceMemberMutation, setIsMemberHandleOpen]);

  const handleAddSpacePlayer = useCallback((userId: number) => {
    if (!activeSpaceId)
      return;

    const isAlreadyMember = spaceMembers.some(m => m.userId === userId);

    const grantPlayer = () => {
      setPlayerMutation.mutate({
        spaceId: activeSpaceId,
        uidList: [userId],
      }, {
        onSettled: () => {
          setIsMemberHandleOpen(false);
        },
      });
    };

    if (isAlreadyMember) {
      grantPlayer();
      return;
    }

    addSpaceMemberMutation.mutate({
      spaceId: activeSpaceId,
      userIdList: [userId],
    }, {
      onSuccess: () => {
        grantPlayer();
      },
      onError: () => {
        grantPlayer();
      },
    });
  }, [activeSpaceId, addSpaceMemberMutation, setIsMemberHandleOpen, setPlayerMutation, spaceMembers]);

  return {
    handleAddRoomMember,
    handleAddSpaceMember,
    handleAddSpacePlayer,
    handleInvitePlayer,
    inviteRoomId,
    isMemberHandleOpen,
    setInviteRoomId,
    setIsMemberHandleOpen,
  };
}
