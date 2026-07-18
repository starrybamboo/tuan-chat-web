import { DEFAULT_IMAGE_MODEL } from "@/components/aiImage/constants";

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
