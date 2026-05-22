## Why

The web app already uses TanStack Router as its routing foundation, but some internal navigation paths still use full-page browser navigation or low-level history calls. Aligning these paths now prevents unnecessary reloads, preserves SPA state, and keeps route/search handling consistent after the URL query cleanup work.

## What Changes

- Replace internal `window.location.href` navigation with TanStack Router navigation for React component flows that stay inside the app.
- Replace internal plain `<a href>` links with TanStack Router `Link` where the link targets an in-app route and does not intentionally open a new tab or external site.
- Preserve browser APIs for legitimate cases such as copying the current URL, building absolute URLs, external links, `target="_blank"` links, and non-React boundary redirects.
- Migrate low-level `router.history.push/replace` usage in touched navigation flows to `useNavigate`, `<Link>`, or `router.navigate` when a typed router call can represent the route cleanly.
- Keep non-navigation helper behavior unchanged, including share links, upload URL normalization, desktop notification targets, and auth boundary redirects.

## Capabilities

### New Capabilities
- `internal-navigation-consistency`: Defines how in-app navigation should use TanStack Router instead of full-page browser navigation or low-level history APIs.

### Modified Capabilities
<!-- No existing spec capability changes. -->

## Impact

- `app/components/common/userAvatar.tsx` — profile avatar clicks should navigate through TanStack Router instead of assigning `window.location.href`.
- `app/components/common/collection/collectionPreview.tsx` — supported collection targets should use SPA navigation instead of refreshing the page.
- `app/components/auth/LoggedInView.tsx` — internal home link should use TanStack Router `Link`.
- `app/routes/scroll-sequence-demo.tsx` — internal demo CTA links should use TanStack Router `Link`.
- Selected `router.history.push/replace` call sites in the same touched flows may move to `useNavigate` or `router.navigate`.
- Tests should cover representative internal navigation behavior without requiring a full browser reload.
