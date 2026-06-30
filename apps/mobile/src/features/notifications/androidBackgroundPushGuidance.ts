import type { AndroidForegroundMessageServiceStatus } from "./androidForegroundMessageService";

export type AndroidBackgroundPushDiagnostics = {
  backgroundRestricted?: boolean | null;
  brand?: string | null;
  ignoringBatteryOptimizations?: boolean | null;
  manufacturer?: string | null;
  model?: string | null;
  packageName?: string | null;
  sdkInt?: number | null;
};

export type AndroidBackgroundPushRisk = "high" | "medium" | "standard";

type VendorRule = {
  label: string;
  keywords: string[];
  risk: AndroidBackgroundPushRisk;
};

const VENDOR_RULES: VendorRule[] = [
  { label: "小米/Redmi/POCO", keywords: ["xiaomi", "redmi", "poco"], risk: "high" },
  { label: "华为/Honor", keywords: ["huawei", "honor"], risk: "high" },
  { label: "OPPO/realme/OnePlus", keywords: ["oppo", "realme", "oneplus", "coloros"], risk: "high" },
  { label: "vivo/iQOO", keywords: ["vivo", "iqoo"], risk: "high" },
  { label: "三星", keywords: ["samsung"], risk: "medium" },
];

export function resolveAndroidBackgroundPushGuidance(diagnostic: AndroidBackgroundPushDiagnostics | null) {
  const vendor = resolveAndroidVendor(diagnostic);
  const batteryIgnored = diagnostic?.ignoringBatteryOptimizations;
  const backgroundRestricted = diagnostic?.backgroundRestricted;
  const needsAttention = vendor.risk !== "standard" || batteryIgnored === false || backgroundRestricted === true;
  const batteryStatus = batteryIgnored == null
    ? "电池优化：未知"
    : `电池优化：${batteryIgnored ? "已放行" : "未放行"}`;
  const restrictionStatus = backgroundRestricted == null
    ? "后台限制：未知"
    : `后台限制：${backgroundRestricted ? "系统已限制" : "未检测到限制"}`;

  return {
    detail: needsAttention
      ? "进入其他 App 后收不到推送时，请允许通知、关闭电池优化，并在系统管家里允许后台运行或自启动。"
      : "当前设备未命中高风险厂商规则，仍建议确认通知权限和电池优化状态。",
    risk: vendor.risk,
    statusItems: [
      `设备：${vendor.label}`,
      batteryStatus,
      restrictionStatus,
    ],
    title: needsAttention ? "后台推送需要系统放行" : "后台推送诊断",
    vendorLabel: vendor.label,
  };
}

export function shouldShowAndroidBackgroundPushOnboarding(
  diagnostic: AndroidBackgroundPushDiagnostics | null,
  serviceStatus: AndroidForegroundMessageServiceStatus | null,
  isDismissed: boolean,
) {
  if (isDismissed || diagnostic === null) {
    return false;
  }

  if (serviceStatus === null) {
    return true;
  }

  const batteryReady = diagnostic.ignoringBatteryOptimizations !== false;
  const backgroundReady = diagnostic.backgroundRestricted !== true;
  const notificationReady = serviceStatus.notificationsEnabled !== false
    && serviceStatus.messageChannelImportance !== 0;

  return !batteryReady || !backgroundReady || !notificationReady;
}

function resolveAndroidVendor(diagnostic: AndroidBackgroundPushDiagnostics | null) {
  const raw = [
    diagnostic?.manufacturer,
    diagnostic?.brand,
    diagnostic?.model,
  ].filter(Boolean).join(" ").toLowerCase();
  const matchedRule = VENDOR_RULES.find(rule => rule.keywords.some(keyword => raw.includes(keyword)));
  if (matchedRule) {
    return { label: matchedRule.label, risk: matchedRule.risk };
  }

  const fallbackLabel = [diagnostic?.manufacturer, diagnostic?.brand]
    .filter(Boolean)
    .join(" / ")
    .trim();
  return { label: fallbackLabel || "Android", risk: "standard" as const };
}
