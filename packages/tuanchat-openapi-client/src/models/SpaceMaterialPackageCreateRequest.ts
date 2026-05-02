/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 创建局内素材包请求
 */
export type SpaceMaterialPackageCreateRequest = {
    /**
     * 空间ID
     */
    spaceId: number;
    /**
     * 素材包名称
     */
    name: string;
    /**
     * 素材包描述
     */
    description?: string;
    /**
     * 素材包封面媒体文件 ID
     */
    coverFileId?: number;
    content: MaterialPackageContent;
};

