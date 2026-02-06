import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";

import type { SpaceContextType } from "@/components/chat/core/spaceContext";

import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";

import type { UserRole } from "../../../../api";

import {
  useGetRoomNpcRoleQuery,
  useGetRoomRoleQuery,
} from "../../../../api/hooks/chatQueryHooks";
import { tuanchat } from "../../../../api/instance";
import { useGetUserRolesQuery } from "../../../../api/queryHooks";

type UseRoomRoleStateParams = {
  roomId: number;
  userId?: number | null;
  isSpaceOwner: SpaceContextType["isSpaceOwner"];
};

type UseRoomRoleStateResult = {
  roomAllRoles: UserRole[];
  roomRolesThatUserOwn: UserRole[];
  curRoleId: number;
  setCurRoleId: (roleId: number) => void;
  curAvatarId: number;
  setCurAvatarId: (avatarId: number) => void;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
};

export default function useRoomRoleState({
  roomId,
  userId,
  isSpaceOwner,
}: UseRoomRoleStateParams): UseRoomRoleStateResult {
  const userRolesQuery = useGetUserRolesQuery(userId ?? -1);
  const userRoles = useMemo(() => userRolesQuery.data?.data ?? [], [userRolesQuery.data?.data]);

  const roomRolesQuery = useGetRoomRoleQuery(roomId);
  const roomBaseRoles = useMemo(() => roomRolesQuery.data?.data ?? [], [roomRolesQuery.data?.data]);
  const roomNpcRolesQuery = useGetRoomNpcRoleQuery(roomId);
  const roomNpcRoles = useMemo(() => roomNpcRolesQuery.data?.data ?? [], [roomNpcRolesQuery.data?.data]);

  const roomAllRoles = useMemo(() => {
    const map = new Map<number, UserRole>();
    for (const role of roomBaseRoles) {
      map.set(role.roleId, role);
    }
    for (const role of roomNpcRoles) {
      map.set(role.roleId, role);
    }
    return [...map.values()];
  }, [roomBaseRoles, roomNpcRoles]);

  const roomRolesThatUserOwn = useMemo(() => {
    const playerRoles = isSpaceOwner
      ? roomBaseRoles
      : roomBaseRoles.filter(role => userRoles.some(userRole => userRole.roleId === role.roleId));
    return [...playerRoles, ...roomNpcRoles];
  }, [isSpaceOwner, roomBaseRoles, roomNpcRoles, userRoles]);

  const curRoleIdMap = useRoomRoleSelectionStore(state => state.curRoleIdMap);
  const curAvatarIdMap = useRoomRoleSelectionStore(state => state.curAvatarIdMap);
  const setCurRoleIdForRoom = useRoomRoleSelectionStore(state => state.setCurRoleIdForRoom);
  const setCurAvatarIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarIdForRole);

  const [runtimeAvatarIdMap, setRuntimeAvatarIdMap] = useState<Record<number, number>>({});
  const runtimeAvatarIdMapRef = useRef(runtimeAvatarIdMap);
  useEffect(() => {
    runtimeAvatarIdMapRef.current = runtimeAvatarIdMap;
  }, [runtimeAvatarIdMap]);

  const roleDefaultAvatarIdMap = useMemo(() => {
    const out: Record<number, number> = {};
    for (const role of roomRolesThatUserOwn) {
      out[role.roleId] = role.avatarId ?? -1;
    }
    return out;
  }, [roomRolesThatUserOwn]);

  useEffect(() => {
    setRuntimeAvatarIdMap((prev) => {
      const next: Record<number, number> = { ...prev };
      let hasChanges = false;
      for (const role of roomRolesThatUserOwn) {
        const roleId = role.roleId;
        const stored = useRoomRoleSelectionStore.getState().curAvatarIdMap[roleId] ?? -1;
        if (stored > 0) {
          continue;
        }
        const fallback = role.avatarId ?? -1;
        const existing = next[roleId];
        if (existing == null || (existing <= 0 && fallback > 0)) {
          next[roleId] = fallback;
          hasChanges = true;
        }
      }
      if (!hasChanges) {
        return prev;
      }
      return next;
    });
  }, [roomRolesThatUserOwn]);

  const pickDefaultAvatarId = useCallback((avatars: Array<{ avatarId?: number; avatarTitle?: { label?: string } }>): number => {
    const defaultLabelAvatar = avatars.find(a => (a.avatarTitle?.label || "") === "默认") ?? null;
    return defaultLabelAvatar?.avatarId ?? (avatars[0]?.avatarId ?? -1);
  }, []);

  const ensureRuntimeAvatarIdForRole = useCallback(async (roleId: number): Promise<number> => {
    if (roleId <= 0) {
      return -1;
    }

    const stored = useRoomRoleSelectionStore.getState().curAvatarIdMap[roleId] ?? -1;
    if (stored > 0) {
      return stored;
    }

    const runtime = runtimeAvatarIdMapRef.current[roleId] ?? -1;
    if (runtime > 0) {
      return runtime;
    }

    const roleDefault = roleDefaultAvatarIdMap[roleId] ?? -1;
    if (roleDefault > 0) {
      setRuntimeAvatarIdMap(prev => ({ ...prev, [roleId]: roleDefault }));
      return roleDefault;
    }

    try {
      const avatars = (await tuanchat.avatarController.getRoleAvatars(roleId))?.data ?? [];
      const picked = pickDefaultAvatarId(avatars);
      if (picked > 0) {
        setRuntimeAvatarIdMap(prev => ({ ...prev, [roleId]: picked }));
        return picked;
      }
    }
    catch {
      // ignore
    }

    setRuntimeAvatarIdMap(prev => ({ ...prev, [roleId]: -1 }));
    return -1;
  }, [pickDefaultAvatarId, roleDefaultAvatarIdMap]);

  const getEffectiveAvatarIdForRole = useCallback((roleId: number): number => {
    if (roleId < 0) {
      return curAvatarIdMap[roleId] ?? -1;
    }
    if (roleId === 0) {
      return -1;
    }
    const stored = curAvatarIdMap[roleId] ?? -1;
    if (stored > 0) {
      return stored;
    }
    const runtime = runtimeAvatarIdMap[roleId] ?? -1;
    if (runtime > 0) {
      return runtime;
    }
    const roleDefault = roleDefaultAvatarIdMap[roleId] ?? -1;
    return roleDefault;
  }, [curAvatarIdMap, roleDefaultAvatarIdMap, runtimeAvatarIdMap]);

  const storedRoleId = curRoleIdMap[roomId];
  const fallbackRoleId = roomRolesThatUserOwn[0]?.roleId ?? -1;
  const curRoleId = (storedRoleId == null)
    ? fallbackRoleId
    : (storedRoleId <= 0 && !isSpaceOwner)
        ? fallbackRoleId
        : storedRoleId;
  const setCurRoleId = useCallback((roleId: number) => {
    if (roleId <= 0 && !isSpaceOwner) {
      toast.error("只有 KP 可以使用旁白");
      return;
    }
    setCurRoleIdForRoom(roomId, roleId);
  }, [isSpaceOwner, roomId, setCurRoleIdForRoom]);

  const curAvatarId = getEffectiveAvatarIdForRole(curRoleId);
  const setCurAvatarId = useCallback((avatarId: number) => {
    setCurAvatarIdForRole(curRoleId, avatarId);
  }, [curRoleId, setCurAvatarIdForRole]);

  return {
    roomAllRoles,
    roomRolesThatUserOwn,
    curRoleId,
    setCurRoleId,
    curAvatarId,
    setCurAvatarId,
    ensureRuntimeAvatarIdForRole,
  };
}
