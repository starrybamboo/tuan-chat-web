export {
  buildAnnotationMap,
  buildCustomAnnotationId,
  getAnnotationCatalog,
  getAnnotationsByCategory,
  getFrequentAnnotations,
  isValidAnnotation,
  normalizeAnnotations,
  toggleAnnotation,
  withNormalModeVisibilityDefaults,
} from "./catalog";

export { BUILTIN_ANNOTATIONS, NORMAL_MODE_HIDDEN_ANNOTATION_IDS } from "./data";

export type { AnnotationDefinition, AnnotationTone } from "./types";
