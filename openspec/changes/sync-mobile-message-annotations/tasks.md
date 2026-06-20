## 1. Web Change Audit

- [x] 1.1 Summarize web-side changes by functional area.
- [x] 1.2 Identify which web changes require mobile parity and which are web-only.

## 2. Mobile Annotation UI

- [x] 2.1 Add mobile annotation picker layout helpers using shared catalog semantics.
- [x] 2.2 Add compact mobile annotation chip/list components for composer and message items.
- [x] 2.3 Add a composer toolbar entry and bottom sheet picker for selected annotations.

## 3. Mobile Send Semantics

- [x] 3.1 Track selected composer annotations in `ChatShell` and reset them on room change/send success.
- [x] 3.2 Filter selected annotations by each outgoing draft's `messageType`.
- [x] 3.3 Include filtered annotations in text, media draft, and state event send requests.

## 4. Verification

- [x] 4.1 Add focused tests for mobile annotation filtering.
- [x] 4.2 Run mobile typecheck and targeted tests.
