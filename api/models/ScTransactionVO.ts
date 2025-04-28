/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * SC交易记录VO
 */
export type ScTransactionVO = {
    /**
     * 交易ID
     */
    scTransactionsId?: number;
    /**
     * 交易编号
     */
    transactionNo?: string;
    /**
     * 用户ID
     */
    userId?: number;
    /**
     * 交易金额
     */
    amount?: number;
    /**
     * 交易前余额
     */
    balanceBefore?: number;
    /**
     * 交易后余额
     */
    balanceAfter?: number;
    /**
     * 交易类型
     */
    type?: string;
    /**
     * 交易状态
     */
    status?: string;
    /**
     * 交易描述
     */
    description?: string;
    /**
     * 创建时间
     */
    createTime?: string;
};

