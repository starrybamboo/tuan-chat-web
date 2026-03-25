import {
  assertOpenApiResultSuccess,
  extractOpenApiErrorMessage,
} from "@/utils/openApiResult";

import { createTuanChatClient, tuanchat } from "../../../api/instance";

type EmailVerificationPurpose
  = | "REGISTER"
    | "CHANGE_PASSWORD"
    | "BIND_EMAIL"
    | "CHANGE_EMAIL_OLD"
    | "CHANGE_EMAIL_NEW";

type SendEmailVerificationCodeParams = {
  email: string;
  purpose: EmailVerificationPurpose;
  authenticated?: boolean;
};

type VerifyEmailVerificationCodeParams = {
  email: string;
  code: string;
  purpose: EmailVerificationPurpose;
  authenticated?: boolean;
};

type ChangePasswordByEmailParams = {
  email: string;
  code: string;
  newPassword: string;
};

type BindEmailParams = {
  email: string;
  code: string;
};

type ChangeEmailParams = {
  oldEmail: string;
  oldCode: string;
  newEmail: string;
  newCode: string;
};

const anonymousTuanChat = createTuanChatClient({ includeToken: false });

function getSecurityClient(authenticated?: boolean) {
  return authenticated ? tuanchat : anonymousTuanChat;
}

export async function sendEmailVerificationCode(params: SendEmailVerificationCodeParams) {
  try {
    const response = await getSecurityClient(params.authenticated).userSecurityController.sendEmailCode({
      email: params.email,
      purpose: params.purpose,
    });
    assertOpenApiResultSuccess(response, "发送邮箱验证码失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "发送邮箱验证码失败"));
  }
}

export async function verifyEmailVerificationCode(params: VerifyEmailVerificationCodeParams) {
  try {
    const response = await getSecurityClient(params.authenticated).userSecurityController.verifyEmailCode({
      email: params.email,
      code: params.code,
      purpose: params.purpose,
    });
    assertOpenApiResultSuccess(response, "校验邮箱验证码失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "校验邮箱验证码失败"));
  }
}

export async function requestForgotPasswordByEmail(email: string) {
  try {
    const response = await anonymousTuanChat.userSecurityController.forgotPassword({ email });
    assertOpenApiResultSuccess(response, "发送找回密码邮件失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "发送找回密码邮件失败"));
  }
}

export async function changePasswordByEmailVerification(params: ChangePasswordByEmailParams) {
  try {
    const response = await tuanchat.userSecurityController.changePassword({
      email: params.email,
      code: params.code,
      newPassword: params.newPassword,
    });
    assertOpenApiResultSuccess(response, "修改密码失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "修改密码失败"));
  }
}

export async function bindEmailByVerification(params: BindEmailParams) {
  try {
    const response = await tuanchat.userSecurityController.bindEmail({
      email: params.email,
      code: params.code,
    });
    assertOpenApiResultSuccess(response, "绑定邮箱失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "绑定邮箱失败"));
  }
}

export async function changeEmailByVerification(params: ChangeEmailParams) {
  try {
    const response = await tuanchat.userSecurityController.changeEmail({
      oldEmail: params.oldEmail,
      oldCode: params.oldCode,
      newEmail: params.newEmail,
      newCode: params.newCode,
    });
    assertOpenApiResultSuccess(response, "换绑邮箱失败");
  }
  catch (error) {
    throw new Error(extractOpenApiErrorMessage(error, "换绑邮箱失败"));
  }
}
