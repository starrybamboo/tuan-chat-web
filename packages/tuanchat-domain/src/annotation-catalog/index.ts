export {
  buildAnnotationMap,
  buildCustomAnnotationId,
  filterAnnotationsForMessageType,
  getAnnotationCatalog,
  getAnnotationsByCategory,
  getFrequentAnnotations,
  isAnnotationVisibleForMessageType,
  isValidAnnotation,
  normalizeAnnotations,
  toggleAnnotation,
  withNormalModeVisibilityDefaults,
} from "./catalog";

export { BUILTIN_ANNOTATIONS, NORMAL_MODE_HIDDEN_ANNOTATION_IDS } from "./data";

export type { AnnotationDefinition, AnnotationTone } from "./types";
