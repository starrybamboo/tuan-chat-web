import { handleUnauthorized } from "@/utils/auth/unauthorized";

import { recoverAuthTokenFromSession } from "./authRecovery";
import type { ApiRequestOptions } from "./core/ApiRequestOptions";
import { ApiError } from "./core/ApiError";
import { BaseHttpRequest } from "./core/BaseHttpRequest";
import { CancelablePromise } from "./core/CancelablePromise";
import type { OpenAPIConfig } from "./core/OpenAPI";
import { request as baseRequest } from "./core/request";

function isUnauthorizedError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 401;
}

function shouldSkipRecovery(options: ApiRequestOptions): boolean {
  return options.url === "/user/token";
}

export class AuthHttpRequest extends BaseHttpRequest {
  constructor(config: OpenAPIConfig) {
    super(config);
  }

  public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
    return new CancelablePromise<T>((resolve, reject, onCancel) => {
      let activeRequest: CancelablePromise<T> | null = null;

      const execute = (allowRecovery: boolean) => {
        if (onCancel.isCancelled) {
          return;
        }

        activeRequest = baseRequest<T>(this.config, options);
        onCancel(() => activeRequest?.cancel());

        activeRequest
          .then(resolve)
          .catch(async (error) => {
            if (!allowRecovery || onCancel.isCancelled || shouldSkipRecovery(options) || !isUnauthorizedError(error)) {
              reject(error);
              return;
            }

            const recoveredToken = await recoverAuthTokenFromSession(this.config.BASE);
            if (onCancel.isCancelled) {
              reject(error);
              return;
            }

            if (recoveredToken) {
              execute(false);
              return;
            }

            handleUnauthorized({ source: "http" });
            reject(error);
          });
      };

      execute(true);
    });
  }
}
