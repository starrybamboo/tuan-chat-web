/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 局外素材包响应
 */
export type MaterialPackageResponse = {
    /**
     * 素材包ID
     */
    packageId?: number;
    /**
     * 作者用户ID
     */
    userId?: number;
    /**
     * 作者用户名
     */
    username?: string;
    /**
     * 作者头像
     */
    avatar?: string;
    /**
     * 作者头像缩略图
     */
    avatarThumbUrl?: string;
    /**
     * 素材包名称
     */
    name?: string;
    /**
     * 素材包描述
     */
    description?: string;
    /**
     * 素材包封面URL
     */
    coverUrl?: string;
    /**
     * 素材包封面原图URL
     */
    originalCoverUrl?: string;
    /**
     * 是否公开
     */
    isPublic?: boolean;
    /**
     * 被导入次数
     */
    importCount?: number;
    /**
     * 文件夹节点数量
     */
    folderCount?: number;
    /**
     * 素材节点数量
     */
    materialCount?: number;
    /**
     * 消息总数
     */
    messageCount?: number;
    content?: MaterialPackageContent;
    /**
     * 创建时间
     */
    createTime?: string;
    /**
     * 更新时间
     */
    updateTime?: string;
};

