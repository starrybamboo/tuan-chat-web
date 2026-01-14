/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AiModuleDto } from '../models/AiModuleDto';
import type { BuyTrainingStepsRequest } from '../models/BuyTrainingStepsRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AiModuleService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * description: "Access Token is incorrect.",
     * type: ApiError,
     * })
     *
     * status: HttpStatus.PAYMENT_REQUIRED,
     * description: "An active subscription required to access this endpoint.",
     * type: ApiError,
     * })
     *
     * description: "A conflict error occured.",
     * type: ApiError,
     * })
     *
     * description: "The training request has been successfully sent.",
     * type: AiModuleDto,
     * })
     *
     * description: "A validation error occured.",
     * type: ApiError,
     * })
     * async trainModule(
         *
         *
         * ): Promise<AiModuleDto> {
             * const user: User = req.user;
             *
             * if (!aiTrainingRequest)
             * throw new HttpException("Incorrect body.", HttpStatus.BAD_REQUEST);
             *
             * if (
                 * !GenerationModelAccessRightsData[aiTrainingRequest.model].canTrainModules
                 * )
                 * throw new HttpException(
                     * "Specified model does not support module training.",
                     * HttpStatus.BAD_REQUEST,
                     * );
                     * if (!user.hasSubscription())
                     * throw new HttpException(
                         * "Incorrect subscription.",
                         * HttpStatus.PAYMENT_REQUIRED,
                         * );
                         * if (aiTrainingRequest.steps < 50)
                         * throw new HttpException(
                             * "Training steps amount is too low.",
                             * HttpStatus.CONFLICT,
                             * );
                             *
                             * if (
                                 * user.availableModuleTrainingSteps + user.purchasedModuleTrainingSteps <
                                 * aiTrainingRequest.steps
                                 * )
                                 * throw new HttpException(
                                     * "You have an insufficent amount of available training steps.",
                                     * HttpStatus.CONFLICT,
                                     * );
                                     *
                                     * if (process.env.NODE_ENV === "production") {
                                         * const modules = (
                                             * await this.aiModuleService.getAllUserModules(user)
                                             * ).filter((item) => item.status == "pending" || item.status == "training");
                                             *
                                             * if (modules.length >= MAX_SIMULTANEOUS_TRAINING_MODULES)
                                             * throw new HttpException(
                                                 * "You have reached the limit of concurrently training modules.",
                                                 * HttpStatus.CONFLICT,
                                                 * );
                                                 * }
                                                 *
                                                 * return await this.aiModuleService.trainModule(user, aiTrainingRequest);
                                                 * }
                                                 * @returns AiModuleDto
                                                 * @throws ApiError
                                                 */
                                                public aiModuleControllerAllModules(): CancelablePromise<Array<AiModuleDto>> {
                                                    return this.httpRequest.request({
                                                        method: 'GET',
                                                        url: '/ai/module/all',
                                                        errors: {
                                                            401: `Access Token is incorrect.`,
                                                            500: `An unknown error occured.`,
                                                        },
                                                    });
                                                }
                                                /**
                                                 * @param id
                                                 * @returns AiModuleDto
                                                 * @throws ApiError
                                                 */
                                                public aiModuleControllerGetModule(
                                                    id: string,
                                                ): CancelablePromise<AiModuleDto> {
                                                    return this.httpRequest.request({
                                                        method: 'GET',
                                                        url: '/ai/module/{id}',
                                                        path: {
                                                            'id': id,
                                                        },
                                                        errors: {
                                                            401: `Access Token is incorrect.`,
                                                            404: `Module not found`,
                                                            500: `An unknown error occured.`,
                                                        },
                                                    });
                                                }
                                                /**
                                                 * @param id
                                                 * @returns AiModuleDto Module deleted successfully.
                                                 * @throws ApiError
                                                 */
                                                public aiModuleControllerDeleteModule(
                                                    id: string,
                                                ): CancelablePromise<AiModuleDto> {
                                                    return this.httpRequest.request({
                                                        method: 'DELETE',
                                                        url: '/ai/module/{id}',
                                                        path: {
                                                            'id': id,
                                                        },
                                                        errors: {
                                                            401: `Access Token is incorrect.`,
                                                            404: `Module not found`,
                                                            409: `A conflict error occured.`,
                                                            500: `An unknown error occured.`,
                                                        },
                                                    });
                                                }
                                                /**
                                                 * @param requestBody
                                                 * @returns any Steps have been purchased properly.
                                                 * @throws ApiError
                                                 */
                                                public aiModuleControllerBuyTrainingSteps(
                                                    requestBody: BuyTrainingStepsRequest,
                                                ): CancelablePromise<any> {
                                                    return this.httpRequest.request({
                                                        method: 'POST',
                                                        url: '/ai/module/buy-training-steps',
                                                        body: requestBody,
                                                        mediaType: 'application/json',
                                                        errors: {
                                                            400: `A validation error occured.`,
                                                            401: `Access Token is incorrect.`,
                                                            409: `A conflict occured while buying training steps.`,
                                                            500: `An unknown error occured.`,
                                                        },
                                                    });
                                                }
                                            }
