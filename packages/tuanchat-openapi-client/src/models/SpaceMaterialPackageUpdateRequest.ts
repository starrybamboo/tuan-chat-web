/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialPackageContent } from './MaterialPackageContent';
/**
 * 更新局内素材包请求
 */
export type SpaceMaterialPackageUpdateRequest = {
    /**
     * 局内素材包ID
     */
    spacePackageId: number;
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
     * 素材包封面URL
     */
    coverUrl?: string;
    content: MaterialPackageContent;
};

