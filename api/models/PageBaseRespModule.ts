/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Module } from './Module';
/**
 * 基础翻页返回
 */
export type PageBaseRespModule = {
    /**
     * 当前页数
     */
    pageNo?: number;
    /**
     * 每页查询数量
     */
    pageSize?: number;
    /**
     * 总记录数
     */
    totalRecords?: number;
    /**
     * 是否最后一页
     */
    isLast?: boolean;
    /**
     * 数据列表
     */
    list?: Array<Module>;
};

