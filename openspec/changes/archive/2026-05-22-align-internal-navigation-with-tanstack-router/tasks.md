## 1. Internal Link Conversion

- [x] 1.1 Replace `LoggedInView` internal home anchor with TanStack Router `Link` while preserving button styling.
- [x] 1.2 Replace `scroll-sequence-demo` internal CTA anchors for `/`, `/chat`, and `/chat/discover/material` with TanStack Router `Link`.
- [x] 1.3 Confirm external links, new-tab links, downloads, and generated markdown links are not changed.

## 2. Imperative Component Navigation

- [x] 2.1 Replace `UserAvatarComponent` profile click `window.location.href` assignment with TanStack Router navigation.
- [x] 2.2 Preserve `UserAvatarComponent` click gating (`clickEnterProfilePage`) and event propagation behavior.
- [x] 2.3 Replace `CollectionPreview` supported internal navigation with TanStack Router navigation.
- [x] 2.4 Preserve `CollectionPreview` unavailable community behavior and avoid navigating to unsupported routes.

## 3. Touched History Usage Cleanup

- [x] 3.1 Review touched files for direct `router.history.push/replace` calls introduced or made obsolete by the change.
- [x] 3.2 Replace straightforward touched history calls with `useNavigate`, `Link`, or `router.navigate` where route behavior remains identical.
- [x] 3.3 Leave boundary or utility history/location usage unchanged when it is outside React Router context or intentionally performs browser-level behavior.

## 4. Tests

- [x] 4.1 Add or update a focused test proving avatar profile navigation uses router navigation without assigning `window.location.href`.
- [x] 4.2 Add or update a focused test proving collection preview supported targets use router navigation and unavailable targets keep toast feedback.
- [x] 4.3 Add or update lightweight render tests for converted `Link` CTAs when existing test harnesses make this practical.

## 5. Verification

- [x] 5.1 Run targeted lint/tests for changed files.
- [x] 5.2 Run `pnpm test`.
- [x] 5.3 Run `pnpm lint`.
- [x] 5.4 Run `pnpm typecheck`, and document unrelated existing blockers separately if the current worktree remains red.
