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
     * 父房间id
     */
    parentRoomId?: number;
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
     * 房间描述
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
};

