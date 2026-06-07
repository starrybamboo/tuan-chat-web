import { DEFAULT_IMAGE_MODEL } from "@/components/aiImage/constants";

export function modelLabel(value: string) {
  if (value === "nai-diffusion-4-5-full")
    return "NAI v4.5 Full";
  if (value === "nai-diffusion-4-5-curated")
    return "NAI v4.5 Curated";
  if (value === "nai-diffusion-4-5-full-inpainting")
    return "NAI v4.5 Full Inpainting";
  if (value === "nai-diffusion-4-5-curated-inpainting")
    return "NAI v4.5 Curated Inpainting";
  if (value === "nai-diffusion-4-full")
    return "NAI v4 Full";
  if (value === "nai-diffusion-4-full-inpainting")
    return "NAI v4 Full Inpainting";
  if (value === "nai-diffusion-4-curated-preview")
    return "NAI v4 Curated Preview";
  if (value === "nai-diffusion-4-curated-inpainting")
    return "NAI v4 Curated Inpainting";
  if (value === "nai-diffusion-3")
    return "NAI v3";
  if (value === "nai-diffusion-3-inpainting")
    return "NAI v3 Inpainting";
  if (value === "nai-diffusion-2")
    return "NAI v2";
  if (value === "nai-diffusion")
    return "NAI";
  if (value === "nai-diffusion-inpainting")
    return "NAI Inpainting";
  if (value === "nai-diffusion-furry")
    return "NAI Furry";
  if (value === "furry-diffusion-inpainting")
    return "NAI Furry Inpainting";
  if (value === "safe-diffusion")
    return "Safe Diffusion";
  if (value === "safe-diffusion-inpainting")
    return "Safe Diffusion Inpainting";
  return value;
}

export function resolveInpaintModel(model: string) {
  const value = String(model || "").trim();
  if (!value)
    return DEFAULT_IMAGE_MODEL;
  if (value.endsWith("-inpainting"))
    return value;
  if (value === "nai-diffusion-4-5-curated")
    return "nai-diffusion-4-5-curated-inpainting";
  if (value === "nai-diffusion-4-5-full")
    return "nai-diffusion-4-5-full-inpainting";
  if (value === "nai-diffusion-4-full")
    return "nai-diffusion-4-full-inpainting";
  if (value === "nai-diffusion-4-curated-preview")
    return "nai-diffusion-4-curated-inpainting";
  if (value === "nai-diffusion-3")
    return "nai-diffusion-3-inpainting";
  if (value === "nai-diffusion-furry")
    return "furry-diffusion-inpainting";
  if (value === "safe-diffusion")
    return "safe-diffusion-inpainting";
  if (value === "nai-diffusion")
    return "nai-diffusion-inpainting";
  return value;
}

export function isNaiV4Family(model: string) {
  const value = String(model || "").trim();
  if (!value)
    return false;
  return value === "nai-diffusion-4-curated-preview"
    || value === "nai-diffusion-4-full"
    || value === "nai-diffusion-4-full-inpainting"
    || value === "nai-diffusion-4-curated-inpainting"
    || value === "nai-diffusion-4-5-curated"
    || value === "nai-diffusion-4-5-curated-inpainting"
    || value === "nai-diffusion-4-5-full"
    || value === "nai-diffusion-4-5-full-inpainting";
}
