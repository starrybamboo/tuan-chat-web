## ADDED Requirements

### Requirement: Image variants SHALL compress in parallel via Web Workers

The system SHALL compress image low and medium quality variants concurrently using `Promise.all`. Each `browser-image-compression` call operates in its own Web Worker (`useWebWorker: true`), enabling true multi-threaded parallelism.

#### Scenario: Two image variants compress simultaneously
- **WHEN** a user uploads a non-GIF image file
- **THEN** the system SHALL start low and medium compression concurrently via `Promise.all`
- **AND** each compression call SHALL run in an independent Web Worker thread
- **AND** the total wall-clock time SHALL be approximately equal to the slower of the two compressions (not their sum)

#### Scenario: Image metadata extraction runs in parallel with original compression
- **WHEN** a user uploads an image file
- **THEN** the system SHALL run `extractImageMetadata` and original file compression concurrently via `Promise.all`
- **AND** both operations read from the same normalized file without conflict

### Requirement: Audio variants SHALL transcode in parallel via isolated FFmpeg instances

The system SHALL transcode audio quality variants concurrently, each using an isolated FFmpeg WASM instance with its own Worker thread. Isolated instances SHALL be terminated after use.

#### Scenario: Audio original and low/medium transcode in parallel
- **WHEN** a user uploads an audio file requiring transcoding
- **THEN** the system SHALL create one isolated FFmpeg instance per quality variant (original if needed, low, medium)
- **AND** all instances SHALL execute concurrently via `Promise.all`
- **AND** each instance SHALL be terminated (`ffmpeg.terminate()`) after its transcode completes or fails

#### Scenario: Isolated instance does not affect singleton
- **WHEN** an isolated FFmpeg instance encounters a WASM memory out-of-bounds error
- **THEN** the system SHALL terminate only that isolated instance and create a fresh one for retry
- **AND** the global singleton instance SHALL remain unaffected

### Requirement: Video variants SHALL transcode in parallel via isolated FFmpeg instances

The system SHALL transcode video quality variants concurrently using the same isolated instance pattern as audio.

#### Scenario: Video original and low/medium transcode in parallel
- **WHEN** a user uploads a video file requiring transcoding
- **THEN** the system SHALL create one isolated FFmpeg instance per quality variant (original if needed, low, medium)
- **AND** all instances SHALL execute concurrently via `Promise.all`
- **AND** each instance SHALL be terminated after completion

#### Scenario: WASM OOB retry with isolated instance
- **WHEN** an isolated video FFmpeg instance encounters `memory access out of bounds`
- **THEN** the system SHALL terminate the failed instance
- **AND** create a new isolated instance
- **AND** retry the same preset once before falling through to the next preset

### Requirement: Batch upload SHALL parallelize prepare phase across files

The system SHALL execute the prepare phase (compression + media upload) for all files in a batch concurrently, while the commit phase (avatar record creation) SHALL execute sequentially in original file order.

#### Scenario: Multiple files prepare concurrently
- **WHEN** a user selects 5 images for batch upload
- **THEN** all 5 files SHALL begin their prepare phase (compress + upload) concurrently
- **AND** the commit phase SHALL await each file's prepare result in original order before creating the avatar record

#### Scenario: Single file failure does not block batch
- **WHEN** one file in a batch fails during the prepare phase
- **THEN** remaining files SHALL continue their prepare phase unaffected
- **AND** the failed file SHALL be reported via `onItemError` callback
- **AND** the commit phase SHALL skip the failed file and continue with successful ones

### Requirement: OSS upload of quality variants SHALL be parallel

The system SHALL upload all quality variant files to their respective OSS URLs concurrently via `Promise.all` after receiving upload targets from the prepare-upload API.

#### Scenario: Multiple quality files upload simultaneously
- **WHEN** the prepare-upload API returns upload targets for original, low, and medium
- **THEN** the system SHALL PUT all variant files to their respective URLs concurrently
- **AND** call the complete endpoint only after all PUTs succeed

### Requirement: SHA-256 deduplication SHALL skip upload when file exists

The system SHALL compute SHA-256 of the original file and send it in the prepare-upload request. If the server indicates `uploadRequired: false`, the system SHALL skip all file uploads and return the existing `fileId`.

#### Scenario: Duplicate file detected
- **WHEN** the prepare-upload API responds with `uploadRequired: false`
- **THEN** the system SHALL NOT upload any files
- **AND** SHALL return the `fileId` from the response immediately
