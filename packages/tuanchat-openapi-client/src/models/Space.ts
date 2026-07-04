/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Space对象
 */
export type Space = {
    /**
     * 空间id
     */
    spaceId?: number;
    /**
     * 空间名称
     */
    name?: string;
    /**
     * 空间头像媒体文件 ID
     */
    avatarFileId?: number;
    /**
     * 空间头像媒体类型
     */
    avatarMediaType?: string;
    /**
     * 空间描述
     */
    description?: string;
    /**
     * 空间规则
     */
    ruleId?: number;
    /**
     * 空间拥有者id
     */
    userId?: number;
    /**
     * 状态：0正常 1删除 2归档
     */
    status?: number;
    /**
     * 空间禁言状态 0未禁言 1全员禁言(裁判除外)
     */
    muteStatus?: number;
    repositoryId?: number;
    /**
     * 克隆来源的base commitId（用于fork追踪）
     */
    parentCommitId?: number;
    /**
     * 骰子角色id
     */
    dicerRoleId?: number;
    roomMap?: Record<string, Array<string>>;
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
    active?: boolean;
    archived?: boolean;
};

