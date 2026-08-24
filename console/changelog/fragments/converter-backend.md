## Local file converter backend

- Added an integration-ready local converter catalog covering documents/PDF, images, audio, video, archives, structured data/spreadsheets, code/text, and binary encodings.
- Kept every unbundled adapter visible but unavailable with its exact missing runtime reason. Machine-wide `PATH` tools and network services do not enable an adapter.
- Added bounded signature-based input detection, fixed worker kernels, mandatory loss and metadata disclosures, storage preflight, cancellation, temporary-output validation, and atomic destination replacement.
- Added a persistent paged queue with bounded concurrency, constant-memory input consumption, per-file outcomes, pause/resume/cancel state, and crash reconciliation.
- Defined PDF inspect, split, merge, extract, reorder, rotate, and metadata contracts with independent reopen validation. No PDF adapter is enabled until its packaged offline runtime is proven.
- Central desktop-process registration and the user interface are intentionally left to their owning integration lanes.
- No tests, lint, type checks, builds, packaging, runtime execution, or screen captures were run in this ultra-speed lane.
