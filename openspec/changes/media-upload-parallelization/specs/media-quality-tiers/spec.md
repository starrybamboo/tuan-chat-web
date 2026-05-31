## ADDED Requirements

### Requirement: All media types SHALL use three quality tiers only

The system SHALL generate exactly three quality tiers for all media types: `original`, `low`, and `medium`. The `high` tier SHALL NOT be generated or uploaded. The `filesByQuality.high` field SHALL be set to `undefined` for type compatibility.

#### Scenario: Image upload generates three tiers
- **WHEN** a user uploads an image file
- **THEN** the system SHALL generate `original` (WebP, ≤3MiB), `low`, and `medium` variants
- **AND** `filesByQuality.high` SHALL be `undefined`
- **AND** no compression work SHALL be performed for the high tier

#### Scenario: Audio upload generates three tiers
- **WHEN** a user uploads an audio file
- **THEN** the system SHALL generate `original` (source or transcoded at high-profile settings if >20MB), `low`, and `medium` variants
- **AND** `filesByQuality.high` SHALL be `undefined`

#### Scenario: Video upload generates three tiers
- **WHEN** a user uploads a video file
- **THEN** the system SHALL generate `original` (source or transcoded at high-profile settings if >200MB), `low`, and `medium` variants
- **AND** `filesByQuality.high` SHALL be `undefined`

### Requirement: Image quality tier parameters

The system SHALL use the following parameters for image quality tiers:

- **original**: Always WebP, maxWidthOrHeight=2560, maxSizeKB=3072, quality=0.82
- **low**: maxWidthOrHeight=200, maxSizeKB=40, quality=0.72, WebP format. Used for: avatar thumbnails, small thumbnails
- **medium**: maxWidthOrHeight=512, maxSizeKB=150, quality=0.76, WebP format. Used for: avatars, list covers, card covers

#### Scenario: Image compressed to original tier
- **WHEN** an image file is uploaded outside a chat room
- **THEN** the system SHALL convert it to WebP using the original profile (maxWidthOrHeight=2560, quality=0.82)
- **AND** the result SHALL be ≤3MiB

#### Scenario: Non-WebP image original rejected by backend
- **WHEN** a non-chatroom image prepare request declares a canonical source MIME other than `image/webp`
- **THEN** the backend SHALL reject the prepare request

### Requirement: Audio quality tier parameters

The system SHALL use the following parameters for audio quality tiers:

- **original**: Source file if ≤20MB; otherwise transcoded at 192kbps Opus/WebM
- **low**: 64kbps Opus/WebM. Used for: preview playback, low-bandwidth scenarios
- **medium**: 128kbps Opus/WebM. Used for: standard playback

#### Scenario: Audio transcoded to low tier
- **WHEN** the system generates the low audio variant
- **THEN** it SHALL transcode to Opus codec at 64kbps in WebM container

#### Scenario: Audio transcoded to medium tier
- **WHEN** the system generates the medium audio variant
- **THEN** it SHALL transcode to Opus codec at 128kbps in WebM container

### Requirement: Video quality tier parameters

The system SHALL use the following parameters for video quality tiers:

- **original**: Source file if ≤200MB; otherwise transcoded at maxHeight=1080, CRF=32, VP9/WebM
- **low**: maxHeight=360, CRF=42, VP8/WebM. Used for: thumbnail previews, low-bandwidth
- **medium**: maxHeight=720, CRF=36, VP8/WebM. Used for: standard playback

#### Scenario: Video transcoded to low tier
- **WHEN** the system generates the low video variant
- **THEN** it SHALL transcode to VP8 codec at maxHeight=360, CRF=42 in WebM container

#### Scenario: Video transcoded to medium tier
- **WHEN** the system generates the medium video variant
- **THEN** it SHALL transcode to VP8 codec at maxHeight=720, CRF=36 in WebM container

### Requirement: NovelAI metadata SHALL be preserved in medium tier images

The system SHALL extract NovelAI metadata from source PNG/WebP files and embed it into the medium quality WebP output. The low tier SHALL NOT preserve metadata (too small to be useful).

#### Scenario: Source image contains NovelAI metadata
- **WHEN** a PNG or WebP image contains NovelAI metadata
- **THEN** the medium variant SHALL embed the metadata into the output WebP
- **AND** the low variant SHALL NOT contain the metadata
- **AND** the system SHALL verify metadata can be read back after embedding

#### Scenario: Embedded metadata causes size overflow
- **WHEN** embedding NovelAI metadata causes the medium variant to exceed maxSizeKB
- **THEN** the system SHALL throw an error and block the upload

### Requirement: Chat room media rendering SHALL use fixed quality tiers

Chat room media upload and rendering on both Web and mobile clients SHALL use fixed quality tiers for the initial request. Runtime display-layer fallback MAY still retry `original` when a requested image variant is unavailable.

Image uploads in chat rooms SHALL generate only `low` and `medium` tiers. Chat room image uploads SHALL NOT generate or upload `original` or `high`.

Sound and video uploads in chat rooms SHALL generate only the `low` tier. Chat room sound and video uploads SHALL NOT generate or upload `medium`, `high`, or `original`.

File, document, and other attachment uploads in chat rooms SHALL generate only the `low` tier. Chat room file/document/other uploads SHALL NOT generate or upload `medium`, `high`, or `original`.

Image message inline previews SHALL always request the `low` tier first. Opening or tapping an image message for large-image viewing SHALL request the `medium` tier first. Chat room image viewing SHALL NOT proactively request `high`, and it SHALL only retry `original` after the requested image variant fails to load.

Sound, video, file, document, and other attachment messages in chat rooms SHALL always request the `low` tier for playback/opening. Chat room rendering for these media types SHALL NOT request `medium`, `high`, or `original`.

#### Scenario: Web chat room renders image messages
- **WHEN** the Web client renders an image message inline in a chat room
- **THEN** it SHALL request the image `low` tier first
- **WHEN** the user opens the image in the large-image viewer
- **THEN** it SHALL request the image `medium` tier first
- **AND** it SHALL NOT proactively request `high`
- **WHEN** the requested `low` or `medium` image variant fails to load
- **THEN** it SHALL retry the same image with the `original` URL as a display fallback

#### Scenario: Mobile chat room renders image messages
- **WHEN** the mobile client renders an image message inline in a chat room
- **THEN** it SHALL request the image `low` tier
- **WHEN** the user taps the image to view it larger
- **THEN** it SHALL request the image `medium` tier
- **AND** it SHALL NOT proactively request `high` or `original` for chat room image viewing

#### Scenario: Chat room renders sound messages
- **WHEN** either Web or mobile renders or opens a sound message in a chat room
- **THEN** it SHALL request the sound `low` tier
- **AND** it SHALL NOT request `medium`, `high`, or `original`

#### Scenario: Chat room renders video messages
- **WHEN** either Web or mobile renders or opens a video message in a chat room
- **THEN** it SHALL request the video `low` tier
- **AND** it SHALL NOT request `medium`, `high`, or `original`

#### Scenario: Chat room renders file/document/other attachment messages
- **WHEN** either Web or mobile renders or opens a file, document, or other attachment message in a chat room
- **THEN** it SHALL request the attachment `low` tier
- **AND** it SHALL NOT request `medium`, `high`, or `original`

#### Scenario: Chat room uploads an image
- **WHEN** the Web or mobile client uploads an image in a chat room
- **THEN** it SHALL generate and upload only `low` and `medium`
- **AND** it SHALL NOT generate or upload `original` or `high`

#### Scenario: Chat room uploads audio or video
- **WHEN** the Web or mobile client uploads sound or video in a chat room
- **THEN** it SHALL generate and upload only `low`
- **AND** it SHALL NOT generate or upload `medium`, `high`, or `original`

#### Scenario: Chat room uploads file-like attachments
- **WHEN** the Web or mobile client uploads a file, document, or other attachment in a chat room
- **THEN** it SHALL generate and upload only `low`
- **AND** it SHALL NOT generate or upload `medium`, `high`, or `original`
