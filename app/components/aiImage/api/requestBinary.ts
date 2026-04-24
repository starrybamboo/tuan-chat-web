import { extractImageDataUrlsFromBinary } from "@/components/aiImage/helpers";
import { fetchWithUnifiedAuth } from "../../../../api/unifiedAuthFetch";

export async function requestNovelAiBinaryViaProxy(requestUrl: string, payload: unknown, options?: { multipart?: boolean }) {
  const headers: Record<string, string> = {
    Accept: "application/octet-stream",
  };
  let body: BodyInit;

  if (options?.multipart) {
    const formData = new FormData();
    formData.append(
      "request",
      new Blob([JSON.stringify(payload)], { type: "application/json" }),
      "blob",
    );
    formData.append("use_new_shared_trial", "true");
    body = formData;
  }
  else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(payload);
  }

  const res = await fetchWithUnifiedAuth(requestUrl, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`请求失败：${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  const dataUrls = extractImageDataUrlsFromBinary(bytes);
  if (!dataUrls.length) {
    const text = await new Response(bytes).text().catch(() => "");
    throw new Error(`响应不是可识别的图片或 ZIP${text ? `：${text.slice(0, 200)}` : ""}`);
  }

  return dataUrls;
}
