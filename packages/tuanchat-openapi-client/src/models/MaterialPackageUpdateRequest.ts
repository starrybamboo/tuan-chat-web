/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 更新局外素材包请求
 */
export type MaterialPackageUpdateRequest = {
    /**
     * 素材包ID
     */
    packageId: number;
    /**
     * 素材包名称
     */
    name: string;
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
    isPublic: boolean;
    content: MaterialPackageContent;
};

