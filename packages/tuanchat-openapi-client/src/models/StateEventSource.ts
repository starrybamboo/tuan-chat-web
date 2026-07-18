/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StateEventSource = {
    /**
     * 事件来源：command 或 ui
     */
    kind: string;
    /**
     * 命令名，仅 command 来源时可选
     */
    commandName?: string;
    /**
     * 解析器版本号
     */
    parserVersion: string;
};
