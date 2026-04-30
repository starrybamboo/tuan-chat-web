/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Room对象
 */
export type Room = {
    /**
     * 房间id
     */
    roomId?: number;
    /**
     * 房间所属空间id
     */
    spaceId?: number;
    /**
     * 房间类型 1游戏房间 2全员房间
     */
    roomType?: number;
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
    /**
     * 房间状态 0正常 1删除
     */
    status?: number;
    /**
     * 禁言状态 0未禁言 1全员禁言(裁判除外)
     */
    muteStatus?: number;
    /**
     * 其他信息
     */
    extra?: string;
    createTime?: string;
    updateTime?: string;
    /**
     * 当前返回是否来自归档视图
     */
    archiveView?: boolean;
    /**
     * 当前返回实际命中的 commitId；在线视图为空
     */
    effectiveCommitId?: number;
};

