## Context

The app is already built on TanStack Router through `app/router.tsx`, `app/main.tsx`, and the generated file-route tree. Most top-level routing is therefore correct, but navigation style is inconsistent in component-level flows:

- Some in-app navigation uses full browser navigation (`window.location.href`) and causes unnecessary reloads.
- Some rendered internal links are ordinary `<a href>` anchors, even though they target TanStack Router routes and stay in the same tab.
- Many components use `router.history.push/replace` directly. This still routes through TanStack's history layer, but it bypasses typed navigation helpers and encourages hand-built URLs/search strings.
- Some browser location usage is not router navigation at all: copying share URLs, building absolute media URLs, external links, auth-boundary redirects, desktop notification fallbacks, and `target="_blank"` links.

The implementation should be targeted rather than global. The goal is to fix the internal navigation flows identified by the audit without disturbing unrelated WIP or legitimate browser APIs.

## Goals / Non-Goals

**Goals:**

- Replace internal full-page navigation in React components with TanStack Router navigation.
- Replace ordinary internal same-tab anchors with TanStack Router `Link`.
- Avoid adding new `router.history.push/replace` calls in touched code when `Link`, `useNavigate`, or `router.navigate` can express the route.
- Preserve current user-facing route targets, labels, styling, and disabled/unavailable behaviors.
- Keep external links, new-tab links, share/copy URL code, and non-React boundary redirects unchanged.

**Non-Goals:**

- Do not migrate every existing `router.history.*` call in the entire app in one pass.
- Do not redesign route structure, route params, or generated TanStack route files.
- Do not change auth invalidation behavior in `app/utils/auth/unauthorized.ts`; it intentionally operates outside React context.
- Do not change desktop notification fallback behavior unless a router-aware boundary is introduced separately.
- Do not modify unrelated Turnstile/auth, sprite/avatar media, WebGAL, or message editor WIP currently present in the worktree.

## Decisions

### 1. Use `Link` for rendered same-tab internal links

Use TanStack Router `Link` when the UI renders a clickable link to an in-app route and the link is not external, not a download, and not explicitly `target="_blank"`.

Primary targets:

- `app/components/auth/LoggedInView.tsx`: replace `<a href="/">` with `Link to="/"`.
- `app/routes/scroll-sequence-demo.tsx`: replace internal CTA anchors for `/`, `/chat`, and `/chat/discover/material` with `Link`.

Rationale: `Link` preserves SPA navigation, gives route-aware behavior, and avoids reloads while keeping markup semantics for links.

Alternative considered: use buttons plus `useNavigate`. Rejected for link-like CTAs because semantic links are more appropriate and already supported by TanStack Router.

### 2. Use `useNavigate` for imperative internal clicks

Use `useNavigate` for click handlers that currently assign `window.location.href` or need imperative navigation from a non-link UI element.

Primary targets:

- `app/components/common/userAvatar.tsx`: avatar click should call `navigate({ to: "/profile/$userId", params: { userId: String(userId) } })` or an equivalent project-compatible route call.
- `app/components/common/collection/collectionPreview.tsx`: supported collection targets should navigate through TanStack Router rather than setting `window.location.href`.

Rationale: These interactions are component-driven and should not reload the page. `useNavigate` keeps behavior inside the router and preserves app state.

Alternative considered: wrap the whole avatar/collection card in `Link`. Rejected as the default because the current components contain nested hover portals, buttons, and conditional unavailable behavior; imperative navigation is lower risk.

### 3. Keep legitimate browser location usage

Do not replace browser location API reads or assignments that are not ordinary in-app component navigation.

Keep examples:

- Current URL copy/share helpers.
- Absolute URL construction for upload/media/runtime utilities.
- External links and new-tab internal profile links.
- `app/utils/auth/unauthorized.ts`, which clears auth state and redirects from a non-React boundary.
- Desktop notification fallback navigation, unless a router-aware notification boundary is designed later.

Rationale: A mechanical replacement would introduce bugs in utility code that deliberately operates outside router context or needs absolute browser state.

### 4. Treat broad `router.history.*` migration as incremental

For files touched by this change, prefer `useNavigate`, `Link`, or `router.navigate` over direct `router.history.push/replace` where the route target is straightforward.

Do not sweep all existing `router.history.*` calls in one patch. Many call sites are intertwined with search params, history state, route-specific wrappers, or existing WIP.

Rationale: The highest-value fixes are reload-causing navigation and ordinary anchors. A broad history migration has higher merge conflict risk and can be done module by module.

## Risks / Trade-offs

- Route param typing may require exact generated route patterns → Use existing route tree names and run typecheck/lint after implementation.
- Replacing anchors with `Link` inside animated components may affect CSS selectors or motion wrappers → Preserve class names and verify rendered markup.
- Avatar click currently calls `stopPropagation`; changing navigation must preserve event propagation behavior → Keep the stop-propagation logic unchanged.
- Collection preview has placeholder/comment behavior for unsupported comment routes → Preserve unsupported behavior or explicitly avoid navigating to nonexistent routes.
- Existing unrelated WIP may keep full `pnpm typecheck` red → Run targeted checks for changed files and report unrelated blockers separately.

## Migration Plan

1. Update same-tab internal anchors to `Link` in the audited components.
2. Update direct `window.location.href` component navigation to `useNavigate`.
3. In the same touched files, remove direct `router.history.*` only when a straightforward TanStack navigation API can replace it without changing behavior.
4. Add or update focused tests for avatar navigation and collection preview routing where test harnesses already exist or can be added narrowly.
5. Run targeted lint/tests for changed files, then broader `pnpm test`, `pnpm lint`, and `pnpm typecheck` when the worktree allows.

## Open Questions

- Should collection type `4` continue pointing to `/comment/:id`, or should it remain non-navigable until a real comment route exists?
- Should notification click handling eventually be routed through a React-level navigation service, or should browser fallback navigation remain the intended behavior?
