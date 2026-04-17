import {
  type BlocksuiteFilterableListOptions,
  localizeBlocksuiteFilterableListOptions,
  translateBlocksuiteElementAttributes,
  translateBlocksuiteElementText,
  translateBlocksuiteUiText,
} from "../i18n/blocksuiteUiLocale";

const UI_LOCALE_PATCHED_KEY = "__TC_BLOCKSUITE_UI_LOCALE_PATCHED__" as const;
const FILTERABLE_OPTIONS_LOCALIZED = "__tcFilterableOptionsLocalized" as const;

type PrototypeWithMarker = {
  [key: string]: unknown;
};

type RenderHost = Element & Record<string, unknown>;
type WindowWithLocaleMarker = Window & {
  [UI_LOCALE_PATCHED_KEY]?: boolean;
};
type FilterableListOptionsWithMarker = BlocksuiteFilterableListOptions & Record<string, unknown>;

function markPatched(prototype: PrototypeWithMarker, key: string): boolean {
  if (prototype[key]) {
    return true;
  }

  prototype[key] = true;
  return false;
}

function patchRender(tagName: string, patchKey: string, patch: (prototype: PrototypeWithMarker) => void) {
  const ctor = customElements.get(tagName) as { prototype?: PrototypeWithMarker } | undefined;
  const prototype = ctor?.prototype;
  if (!prototype || markPatched(prototype, patchKey)) {
    return;
  }

  patch(prototype);
}

function patchParagraphPlaceholder() {
  patchRender("affine-paragraph", "__tcBlocksuiteParagraphPlaceholderLocalePatched", (prototype) => {
    const placeholderDescriptor = Object.getOwnPropertyDescriptor(prototype, "_placeholder");
    const originalGetter = placeholderDescriptor?.get;
    if (typeof originalGetter !== "function") {
      return;
    }

    Object.defineProperty(prototype, "_placeholder", {
      configurable: placeholderDescriptor?.configurable ?? true,
      enumerable: placeholderDescriptor?.enumerable ?? false,
      get(this: unknown) {
        const placeholder = originalGetter.call(this);
        return typeof placeholder === "string"
          ? translateBlocksuiteUiText(placeholder)
          : placeholder;
      },
      set: placeholderDescriptor?.set,
    });
  });
}

function localizeElementHost(element: Element) {
  translateBlocksuiteElementAttributes(element);
  translateBlocksuiteElementText(element);
}

function patchIconLikeRender(tagName: string, patchKey: string, tooltipKey: "tooltip" | null) {
  patchRender(tagName, patchKey, (prototype) => {
    const originalRender = prototype.render as ((...args: unknown[]) => unknown) | undefined;
    if (typeof originalRender !== "function") {
      return;
    }

    prototype.render = function (this: unknown, ...args: unknown[]) {
      const host = this as Record<string, unknown>;
      if (tooltipKey && typeof host[tooltipKey] === "string") {
        const tooltip = host[tooltipKey] as string;
        const translatedTooltip = translateBlocksuiteUiText(tooltip);
        if (translatedTooltip !== tooltip) {
          host[tooltipKey] = translatedTooltip;
        }
      }

      if (typeof host.text === "string") {
        const text = host.text;
        const translatedText = translateBlocksuiteUiText(text);
        if (translatedText !== text) {
          host.text = translatedText;
        }
      }

      if (typeof host.subText === "string") {
        const subText = host.subText;
        const translatedSubText = translateBlocksuiteUiText(subText);
        if (translatedSubText !== subText) {
          host.subText = translatedSubText;
        }
      }

      if (this instanceof Element) {
        localizeElementHost(this as RenderHost);
      }

      return originalRender.apply(this, args);
    };
  });
}

function patchFilterableList() {
  patchRender("affine-filterable-list", "__tcBlocksuiteFilterableListLocalePatched", (prototype) => {
    const originalRender = prototype.render as ((...args: unknown[]) => unknown) | undefined;
    if (typeof originalRender !== "function") {
      return;
    }

    prototype.render = function (this: unknown, ...args: unknown[]) {
      const host = this as Record<string, unknown>;
      const currentOptions = host.options as FilterableListOptionsWithMarker | undefined;
      if (currentOptions && !currentOptions[FILTERABLE_OPTIONS_LOCALIZED]) {
        const localizedOptions: FilterableListOptionsWithMarker = {
          ...localizeBlocksuiteFilterableListOptions(currentOptions),
        };
        Object.defineProperty(localizedOptions, FILTERABLE_OPTIONS_LOCALIZED, {
          configurable: false,
          enumerable: false,
          value: true,
          writable: false,
        });
        host.options = localizedOptions;
      }

      return originalRender.apply(this, args);
    };
  });
}

function patchLocalizedRender(tagName: string, patchKey: string) {
  patchRender(tagName, patchKey, (prototype) => {
    const originalRender = prototype.render as ((...args: unknown[]) => unknown) | undefined;
    if (typeof originalRender !== "function") {
      return;
    }

    prototype.render = function (this: unknown, ...args: unknown[]) {
      const rendered = originalRender.apply(this, args);
      queueMicrotask(() => {
        if (this instanceof Element) {
          localizeElementHost(this);
        }
      });
      return rendered;
    };
  });
}

function patchKnownElements() {
  patchParagraphPlaceholder();
  patchLocalizedRender("affine-menu", "__tcBlocksuiteAffineMenuLocalePatched");
  patchIconLikeRender("icon-button", "__tcBlocksuiteIconButtonLocalePatched", null);
  patchIconLikeRender("editor-icon-button", "__tcBlocksuiteEditorIconButtonLocalePatched", "tooltip");
  patchIconLikeRender("edgeless-tool-icon-button", "__tcBlocksuiteEdgelessToolIconButtonLocalePatched", "tooltip");
  patchIconLikeRender("editor-menu-action", "__tcBlocksuiteEditorMenuActionLocalePatched", null);
  patchIconLikeRender("affine-tooltip", "__tcBlocksuiteTooltipLocalePatched", null);
  patchFilterableList();
}

export function patchBlocksuiteUiLocale() {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    return;
  }

  const owner = window as WindowWithLocaleMarker;
  if (!owner[UI_LOCALE_PATCHED_KEY]) {
    const registry = window.customElements;
    const originalDefine = registry.define.bind(registry);
    registry.define = function (name, constructor, options) {
      originalDefine(name, constructor, options);
      patchKnownElements();
    };
    owner[UI_LOCALE_PATCHED_KEY] = true;
  }

  patchKnownElements();
}
