export function getScreenSize(): "sm" | "md" | "lg" {
  if (typeof window === "undefined") {
    return "lg";
  }
  const width = window.innerWidth;
  if (width < 640)
    return "sm";
  if (width < 1024)
    return "md";
  return "lg";
}
