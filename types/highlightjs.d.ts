declare module "highlightjs" {
  // Minimal typing to satisfy TS in this project
  export function highlight(code: string, options: { language: string }): { value: string };
  export function highlight(language: string, code: string, ignoreIllegals?: boolean): { value: string };
  export function highlightAuto(code: string): { value: string };
  export function getLanguage(lang: string): any;
  export function escapeHTML(code: string): string;
  const _default: any;
  export default _default;
}
