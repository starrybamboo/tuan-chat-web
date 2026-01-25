/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type WebgalVarPayload = {
    /**
     * 变量作用域：当前仅支持 space
     */
    scope: string;
    /**
     * 变量操作：当前仅支持 set
     */
    op: string;
    /**
     * 变量名
     */
    key: string;
    /**
     * 变量表达式（透传给 WebGAL）
     */
    expr: string;
    /**
     * 是否全局变量（当前强制 true）
     */
    global: boolean;
};

