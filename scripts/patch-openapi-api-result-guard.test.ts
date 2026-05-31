import { describe, expect, it } from "vitest";

import { patchRequestSource } from "./patch-openapi-api-result-guard.mjs";

const generatedRequestSource = `import { ApiError } from './ApiError';
import type { ApiRequestOptions } from './ApiRequestOptions';
import type { ApiResult } from './ApiResult';

export const catchErrorCodes = (options: ApiRequestOptions, result: ApiResult): void => {
    if (!result.ok) {
        throw new ApiError(options, result, 'Generic Error');
    }
};

/**
 * Request method
 */
export const request = <T>(config: unknown, options: ApiRequestOptions): Promise<T> => {
    const result = {} as ApiResult;
                catchErrorCodes(options, result);

                return Promise.resolve(result.body);
};
`;

describe("patch-openapi-api-result-guard", () => {
  it("会给生成的 request.ts 插入 ApiResult 业务失败 guard", () => {
    const patched = patchRequestSource(generatedRequestSource);

    expect(patched).toContain("export const catchApiResultFailure");
    expect(patched).toContain("catchApiResultFailure(options, result);");
    expect(patched.indexOf("catchErrorCodes(options, result);"))
      .toBeLessThan(patched.indexOf("catchApiResultFailure(options, result);"));
  });

  it("重复执行不会重复插入 guard", () => {
    const patchedOnce = patchRequestSource(generatedRequestSource);
    const patchedTwice = patchRequestSource(patchedOnce);

    expect(patchedTwice).toBe(patchedOnce);
    expect(patchedTwice.match(/catchApiResultFailure/g)).toHaveLength(2);
  });
});
