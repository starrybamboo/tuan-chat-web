# internal-navigation-consistency Specification

## Purpose
Ensure in-app navigation in React components uses TanStack Router APIs for SPA behavior while preserving legitimate browser-location use cases.

## Requirements
### Requirement: Internal component navigation SHALL use TanStack Router
React components that navigate to an in-app route SHALL use TanStack Router APIs (`Link`, `useNavigate`, or `router.navigate`) instead of assigning `window.location.href` or calling `window.location.assign`.

#### Scenario: Avatar click opens profile without full reload
- **WHEN** a user clicks an avatar configured to enter the profile page
- **THEN** the app SHALL navigate to `/profile/$userId` through TanStack Router
- **AND** the app SHALL NOT perform a full-page browser reload

#### Scenario: Collection preview opens supported internal target without full reload
- **WHEN** a user clicks a collection preview whose type maps to a supported in-app route
- **THEN** the app SHALL navigate through TanStack Router to that route
- **AND** unsupported or unavailable collection types SHALL keep their existing non-navigation feedback behavior

### Requirement: Internal route links SHALL use TanStack Link
Rendered links to in-app routes SHALL use TanStack Router `Link` when they do not intentionally open a new tab, download a file, or target an external origin.

#### Scenario: Logged-in home action uses SPA link
- **WHEN** the logged-in view renders the "前往主页" action
- **THEN** it SHALL render a TanStack Router `Link` to `/`
- **AND** activating the action SHALL preserve SPA navigation behavior

#### Scenario: Scroll demo calls to action use SPA links
- **WHEN** the scroll sequence demo renders internal calls to action such as `/chat` or `/chat/discover/material`
- **THEN** those calls to action SHALL be TanStack Router `Link` elements
- **AND** external links or deliberately new-tab links SHALL remain ordinary anchors

### Requirement: Router history usage SHALL be limited to boundary cases
New or touched internal navigation code SHALL prefer `useNavigate`, `Link`, or `router.navigate` over direct `router.history.push/replace` when the route can be expressed with TanStack Router navigation.

#### Scenario: Touched route mutation uses typed navigation when practical
- **WHEN** implementation updates a navigation path already in scope for this change
- **THEN** the updated code SHALL avoid introducing new direct `router.history.push/replace` calls for ordinary in-app navigation
- **AND** any remaining direct history usage SHALL be justified by boundary needs such as preserving custom history state or a utility outside React navigation context

### Requirement: Legitimate browser-location uses SHALL remain unchanged
Browser location APIs SHALL remain available for non-router concerns, including current URL copying, absolute URL construction, external redirects, auth-boundary reloads, notification fallback navigation outside React context, and resource URL normalization.

#### Scenario: Non-navigation browser URL usage is preserved
- **WHEN** code reads `window.location.href` to copy a share link or build an absolute resource URL
- **THEN** the behavior SHALL remain unchanged
- **AND** the implementation SHALL NOT replace such reads with TanStack Router navigation APIs
