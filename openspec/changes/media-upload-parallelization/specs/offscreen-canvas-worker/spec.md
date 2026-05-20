## ADDED Requirements

### Requirement: GIF rasterization SHALL execute in a Web Worker via OffscreenCanvas

The system SHALL perform GIF-to-WebP rasterization in a dedicated Web Worker using `OffscreenCanvas` and `convertToBlob()`, freeing the main thread from canvas operations.

#### Scenario: GIF file processed off main thread
- **WHEN** a user uploads a GIF image file
- **THEN** the system SHALL transfer an `ImageBitmap` to a Web Worker
- **AND** the Worker SHALL create an `OffscreenCanvas`, draw the image, and call `convertToBlob({ type: "image/webp", quality })` to produce the output
- **AND** the main thread SHALL NOT create any `<canvas>` elements for this operation

#### Scenario: Multiple GIF variants compress in parallel
- **WHEN** the system needs to generate low and medium variants from a GIF
- **THEN** each variant SHALL be processed in its own Worker invocation (or concurrent messages to the same Worker)
- **AND** both SHALL execute concurrently via `Promise.all`

### Requirement: OffscreenCanvas Worker SHALL support iterative quality reduction

The Worker SHALL implement the same iterative compression strategy as the current main-thread implementation: try multiple quality candidates, shrink dimensions if output exceeds target size, up to a maximum number of rounds.

#### Scenario: Output exceeds target size
- **WHEN** the initial WebP blob exceeds `maxSizeKB`
- **THEN** the Worker SHALL retry with progressively lower quality values
- **AND** if still too large after all quality candidates, SHALL shrink canvas dimensions by 0.75x and repeat
- **AND** SHALL throw an error if the target size cannot be met after 5 rounds

#### Scenario: Output within target size on first attempt
- **WHEN** the initial WebP blob is within `maxSizeKB`
- **THEN** the Worker SHALL return the blob immediately without further compression attempts

### Requirement: System SHALL fallback to main-thread canvas when OffscreenCanvas is unavailable

The system SHALL detect `OffscreenCanvas` support at runtime and fall back to the existing main-thread `document.createElement("canvas")` implementation when unavailable.

#### Scenario: Browser does not support OffscreenCanvas
- **WHEN** `typeof OffscreenCanvas === "undefined"` in the Worker or main thread
- **THEN** the system SHALL use the existing main-thread canvas rasterization path
- **AND** SHALL NOT throw an error or fail the upload

#### Scenario: Browser supports OffscreenCanvas
- **WHEN** `typeof OffscreenCanvas !== "undefined"`
- **THEN** the system SHALL use the Worker-based path for GIF rasterization

### Requirement: Worker SHALL accept ImageBitmap as transferable

The system SHALL create an `ImageBitmap` from the GIF file on the main thread and transfer it to the Worker using the structured clone algorithm's transfer list, avoiding data copying.

#### Scenario: ImageBitmap transferred to Worker
- **WHEN** the main thread sends a rasterization request to the Worker
- **THEN** the `ImageBitmap` SHALL be included in the `transfer` list of `postMessage`
- **AND** the main thread's reference to the `ImageBitmap` SHALL become detached (neutered) after transfer
