/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 局内素材包响应
 */
export type SpaceMaterialPackageResponse = {
    /**
     * 局内素材包ID
     */
    spacePackageId?: number;
    /**
     * 空间ID
     */
    spaceId?: number;
    /**
     * 来源局外素材包ID
     */
    sourcePackageId?: number;
    /**
     * 来源局外素材包作者ID
     */
    sourceUserId?: number;
    /**
     * 执行导入的用户ID
     */
    importedBy?: number;
    /**
     * 素材包名称
     */
    name?: string;
    /**
     * 素材包描述
     */
    description?: string;
    /**
     * 素材包封面媒体文件 ID
     */
    coverFileId?: number;
    /**
     * 素材包封面媒体类型
     */
    coverMediaType?: string;
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

