import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requestPath = resolve(repoRoot, "packages/tuanchat-openapi-client/src/core/request.ts");

const guardBlock = `type ApiResultFailureBody = {
    errMsg?: unknown;
    message?: unknown;
    success: false;
};

const isApiResultFailureBody = (body: unknown): body is ApiResultFailureBody => {
    return typeof body === 'object'
        && body !== null
        && Object.prototype.hasOwnProperty.call(body, 'success')
        && (body as { success?: unknown }).success === false;
};

const getApiResultErrorMessage = (body: ApiResultFailureBody): string => {
    if (typeof body.errMsg === 'string' && body.errMsg.trim() !== '') {
        return body.errMsg.trim();
    }
    if (typeof body.message === 'string' && body.message.trim() !== '') {
        return body.message.trim();
    }
    return 'ApiResult Error';
};

export const catchApiResultFailure = (options: ApiRequestOptions, result: ApiResult): void => {
    if (isApiResultFailureBody(result.body)) {
        throw new ApiError(options, result, getApiResultErrorMessage(result.body));
    }
};

`;

const guardCall = "                catchApiResultFailure(options, result);\n";
const guardAnchor = "/**\n * Request method";
const callAnchor = "                catchErrorCodes(options, result);\n";

function patchRequestSource(source) {
  let nextSource = source;

  if (!nextSource.includes("export const catchApiResultFailure")) {
    if (!nextSource.includes(guardAnchor)) {
      throw new Error("无法定位 OpenAPI request guard 插入位置。");
    }
    nextSource = nextSource.replace(guardAnchor, `${guardBlock}${guardAnchor}`);
  }

  if (!nextSource.includes("catchApiResultFailure(options, result);")) {
    if (!nextSource.includes(callAnchor)) {
      throw new Error("无法定位 OpenAPI request guard 调用位置。");
    }
    nextSource = nextSource.replace(callAnchor, `${callAnchor}${guardCall}`);
  }

  return nextSource;
}

function patchRequestFile() {
  const source = readFileSync(requestPath, "utf8");
  const nextSource = patchRequestSource(source);

  if (nextSource !== source) {
    writeFileSync(requestPath, nextSource, "utf8");
  }

  if (!nextSource.includes("export const catchApiResultFailure")
    || !nextSource.includes("catchApiResultFailure(options, result);")) {
    throw new Error("OpenAPI request ApiResult guard 未成功写入。");
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  patchRequestFile();
}

export { patchRequestFile, patchRequestSource };
