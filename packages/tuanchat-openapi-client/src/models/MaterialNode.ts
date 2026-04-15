/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MaterialMessageItem } from './MaterialMessageItem';
/**
 * 素材包节点；folder 表示文件夹节点，material 表示素材节点
 */
export type MaterialNode = {
    /**
     * 节点类型
     */
    type?: MaterialNode.type;
    /**
     * 节点名称
     */
    name?: string;
    /**
     * 素材备注，仅 material 节点使用
     */
    note?: string;
    /**
     * 子节点，仅 folder 节点使用
     */
    children?: Array<MaterialNode>;
    /**
     * 消息列表，仅 material 节点使用
     */
    messages?: Array<MaterialMessageItem>;
};
export namespace MaterialNode {
    /**
     * 节点类型
     */
    export enum type {
        FOLDER = 'folder',
        MATERIAL = 'material',
    }
}

