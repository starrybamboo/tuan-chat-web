## ADDED Requirements

### Requirement: Image uploads SHALL normalize into a WebP original plus sparse derived tiers

The system SHALL normalize every uploaded image into a WebP `original` asset on the client, and SHALL treat `low`, `medium`, and `high` as optional derived tiers. The media service SHALL receive image uploads only after that client-side normalization has completed, and SHALL NOT perform image-format conversion or maintain a GIF-specific upload path. Animated GIF inputs SHALL be re-encoded to animated WebP on the client before prepare-upload. The client SHALL generate and upload a derived tier only when the normalized `original` still exceeds that tier's byte budget. The actual uploaded image tier set SHALL be recorded in `metadata.uploadedQualities`, and the media service SHALL honor that set when issuing upload targets.

- **original**: maxWidthOrHeight=2560, maxSizeKB=3072, quality=1, WebP, preserve NovelAI metadata
- **low**: maxWidthOrHeight=200, maxSizeKB=40, quality=1, WebP, do not preserve NovelAI metadata
- **medium**: maxWidthOrHeight=512, maxSizeKB=150, quality=1, WebP, preserve NovelAI metadata
- **high**: maxWidthOrHeight=2560, maxSizeKB=800, quality=1, WebP, preserve NovelAI metadata

#### Scenario: Non-chatroom image upload generates every useful tier
- **WHEN** a user uploads an image outside a chat room
- **AND** the normalized `original` is larger than 800KB
- **THEN** the system SHALL generate and upload `original`, `low`, `medium`, and `high`
- **AND** `metadata.uploadedQualities` SHALL equal `["original", "low", "medium", "high"]`

#### Scenario: Small image skips redundant derived tiers
- **WHEN** a user uploads an image
- **AND** the normalized `original` is already within a derived tier's byte budget
- **THEN** the system SHALL omit that derived tier from `metadata.uploadedQualities`
- **AND** the system SHALL NOT upload a duplicate object for that omitted tier

#### Scenario: Original-only image upload
- **WHEN** a user uploads an image
- **AND** the normalized `original` is less than or equal to 40KB
- **THEN** the system SHALL upload only `original`
- **AND** `metadata.uploadedQualities` SHALL equal `["original"]`

#### Scenario: Animated GIF image upload
- **WHEN** a user uploads a GIF image
- **THEN** the client SHALL re-encode it into an animated WebP `original` before prepare-upload
- **AND** the upload request SHALL declare the resulting image as `image/webp`
- **AND** the media service SHALL treat it as a normal WebP image upload without any GIF-specific special case

#### Scenario: Chatroom image upload uses the same sparse image rules
- **WHEN** a user uploads an image in a chat room
- **THEN** the system SHALL still generate a WebP `original`
- **AND** the system SHALL apply the same `low` / `medium` / `high` usefulness test based on the normalized `original` size
- **AND** the actual uploaded tiers SHALL be encoded in `metadata.uploadedQualities`

#### Scenario: Prepare-upload honors uploaded image qualities
- **WHEN** the client submits image metadata containing `uploadedQualities`
- **THEN** the media service SHALL issue upload targets only for those listed image tiers
- **AND** the media service SHALL NOT require omitted image tiers to complete the upload

### Requirement: NovelAI metadata SHALL be preserved on non-thumbnail WebP image tiers

The system SHALL preserve NovelAI metadata on image `original`, `medium`, and `high` outputs. The `low` tier SHALL NOT preserve NovelAI metadata.

#### Scenario: Source image contains NovelAI metadata
- **WHEN** a PNG or WebP image contains NovelAI metadata
- **THEN** the generated `original`, `medium`, and `high` WebP outputs SHALL embed that metadata
- **AND** the `low` output SHALL NOT contain the metadata
- **AND** the system SHALL verify that the embedded metadata can be read back successfully

#### Scenario: Embedded metadata causes size overflow
- **WHEN** preserving NovelAI metadata causes a target image tier to exceed its maxSizeKB limit
- **THEN** the system SHALL throw an error
- **AND** the upload SHALL be blocked

### Requirement: Non-image uploads SHALL use scene-specific quality tier sets

The system SHALL keep scene-specific tier behavior for audio, video, document, and other uploads.

- **Audio outside chat rooms**: `original`, `low`, `medium`
- **Audio in chat rooms**: `low` only
- **Video outside chat rooms**: `original`, `low`, `medium`
- **Video in chat rooms**: `low` only
- **Document/other outside chat rooms**: `original`, `low`
- **Document/other in chat rooms**: `low` only

For oversize non-chatroom uploads, the system SHALL transcode the `original` asset into the high-profile preset used to satisfy the original size cap, but SHALL NOT expose a separate public `high` output for audio or video.

#### Scenario: Non-chatroom audio upload
- **WHEN** a user uploads audio outside a chat room
- **THEN** the system SHALL expose `original`, `low`, and `medium`
- **AND** it SHALL transcode `low` to 64kbps Opus/WebM and `medium` to 128kbps Opus/WebM when transcoding is required
- **AND** it MAY reuse the source file for `original`, `low`, and `medium` when the source is already `audio/webm`
- **AND** the `original` SHALL otherwise remain the source file when it is at most 20MB
- **AND** the `original` SHALL otherwise be transcoded with the high-profile 192kbps Opus/WebM preset and remain at most 20MB

#### Scenario: Chatroom audio upload
- **WHEN** a user uploads audio in a chat room
- **THEN** the system SHALL upload only the `low` audio tier
- **AND** it SHALL NOT upload `original` or `medium`

#### Scenario: Non-chatroom video upload
- **WHEN** a user uploads video outside a chat room
- **THEN** the system SHALL expose `original`, `low`, and `medium`
- **AND** it SHALL transcode `low` to maxHeight=360, CRF=42, WebM and `medium` to maxHeight=720, CRF=36, WebM when transcoding is required
- **AND** it MAY reuse the source file for `original`, `low`, and `medium` when the source is already `video/webm`
- **AND** the `original` SHALL otherwise remain the source file when it is at most 200MB
- **AND** the `original` SHALL otherwise be transcoded with the high-profile maxHeight=1080, CRF=32, WebM preset and remain at most 200MB

#### Scenario: Chatroom video upload
- **WHEN** a user uploads video in a chat room
- **THEN** the system SHALL upload only the `low` video tier
- **AND** it SHALL NOT upload `original` or `medium`

#### Scenario: Non-chatroom file-like upload
- **WHEN** a user uploads a document or other attachment outside a chat room
- **THEN** the system SHALL upload `original` and `low`

#### Scenario: Chatroom file-like upload
- **WHEN** a user uploads a document or other attachment in a chat room
- **THEN** the system SHALL upload only `low`

### Requirement: Media rendering SHALL resolve display URLs through derived image status

Web and mobile clients SHALL treat the caller-provided media tier URL as display intent, not always as the final first-fetch URL. For internal image assets, clients MAY maintain a per-file derived-image status cache with `unknown`, `available`, and `missing` semantics. A known `missing` status SHALL allow the client to resolve the display URL to the same file's `original` URL before starting the image or background-image load. This is a breaking change from the previous rule that forbade client-side rewriting before the first fetch.

#### Scenario: Unknown image tier starts from the requested tier URL
- **WHEN** a client renders an internal image asset
- **AND** the client has no derived-image status record for that file
- **THEN** it SHALL start display from the requested tier URL such as `/media/v1/files/{shard}/{fileId}/image/low.webp`, `/image/medium.webp`, `/image/high.webp`, or `/original`
- **AND** it MAY learn the derived-image status from the resulting load, error, or authoritative media metadata

#### Scenario: Known missing image tier starts from original
- **WHEN** a client renders `/media/v1/files/{shard}/{fileId}/image/medium.webp`
- **AND** its local derived-image status for that file is `missing`
- **THEN** it SHALL resolve the display URL to `/media/v1/files/{shard}/{fileId}/original` before starting the browser image load
- **AND** it SHALL NOT request the known-missing derived object as part of normal display

#### Scenario: Known available image tier preserves the requested tier
- **WHEN** a client renders `/media/v1/files/{shard}/{fileId}/image/medium.webp`
- **AND** its local derived-image status for that file is `available`
- **THEN** it SHALL keep the requested derived URL as the display URL

### Requirement: Missing derived media objects SHALL permanently redirect to original

When a requested non-`original` media object is unavailable but an `original` object exists for the same file, the media service SHALL handle the primary fallback by issuing an HTTP `308 Permanent Redirect` to the `original` URL. This redirect-based fallback SHALL cover sparse image uploads, old stale variant URLs, and storage states where a derivative object is missing but the `original` remains readable. Runtime display-layer fallback MAY still retry `original` when the redirect path is bypassed or the image element still ends in an error state.

#### Scenario: Missing image variant redirects to original
- **WHEN** a client requests `/media/v1/files/{shard}/{fileId}/image/medium.webp`
- **AND** that object does not exist
- **AND** `/media/v1/files/{shard}/{fileId}/original` exists
- **THEN** the media service SHALL return `308 Permanent Redirect`
- **AND** the `Location` header SHALL point to `/media/v1/files/{shard}/{fileId}/original`
- **AND** the response SHALL use immutable public caching

#### Scenario: Sparse image upload omits a tier
- **WHEN** an image upload intentionally omits `medium` or `high` because `original` is already small enough
- **AND** a client later requests the omitted image tier URL
- **THEN** the media service SHALL permanently redirect that request to `original`

#### Scenario: Existing derived object does not redirect
- **WHEN** a client requests a derived object that does exist in storage
- **THEN** the media service SHALL serve that requested object directly
- **AND** it SHALL NOT redirect to `original`

#### Scenario: Display-layer fallback remains a secondary guard
- **WHEN** a direct image load still surfaces an error to the client after the media-service path is attempted
- **THEN** display-layer helpers such as `MediaImage` and image preloading utilities MAY retry the corresponding `original` URL
- **AND** that client retry SHALL be treated as defense in depth rather than the primary fallback path

### Requirement: Derived image status caches SHALL use conservative write semantics

Derived image status records SHALL be keyed by media `fileId` and SHALL describe whether non-`original` image objects for that file are known to be usable for display. These records are a display optimization only; they SHALL NOT change upload metadata or the canonical media source stored in messages.

#### Scenario: Derived object failure records missing
- **WHEN** a client attempts to load or probe an internal image derived URL
- **AND** that derived object is proven unavailable
- **THEN** the client MAY write `missing` for that fileId
- **AND** later display resolution MAY use `original` without retrying that derived object

#### Scenario: Original display does not record derived availability
- **WHEN** a client displays `/media/v1/files/{shard}/{fileId}/original`
- **THEN** it SHALL NOT write `available` for that fileId's derived image status
- **AND** it SHALL NOT clear an existing `missing` record

#### Scenario: Redirected original success does not prove derived availability
- **WHEN** the media service may satisfy a requested derived URL by redirecting to `/original`
- **AND** the client cannot distinguish a direct derived-object success from a redirected original success
- **THEN** the client SHALL NOT write `available` solely because the image element reports a successful load
- **AND** it SHALL leave the derived-image status unchanged unless authoritative media metadata or a redirect-aware probe proves the derived object exists

#### Scenario: Proven derived object success records available
- **WHEN** a client has authoritative evidence that a requested derived image object itself exists
- **THEN** the client MAY write `available` for that fileId
- **AND** future display resolution MAY keep the requested derived tier URL
