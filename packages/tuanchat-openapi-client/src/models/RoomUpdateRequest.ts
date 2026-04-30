/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * 房间信息更新请求
 */
export type RoomUpdateRequest = {
    /**
     * 房间ID
     */
    roomId: number;
    /**
     * 房间名称
     */
    name?: string;
    /**
     * 房间头像
     */
    avatar?: string;
    /**
     * 房间头像缩略图的url
     */
    avatarThumbUrl?: string;
    /**
     * 房间头像原图
     */
    originalAvatar?: string;
    /**
     * 场景简要描述，概述本房间的剧情走向
     */
    description?: string;
};

