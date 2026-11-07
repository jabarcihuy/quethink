# Quethink 2D assets

Custom flat SVG geometry, authored for Quethink on 4 November 2026 in response to the request for 2D assets without a generated 3D look. Existing palette: indigo, warm apricot, mint, ivory and ink. No raster textures, gradients, perspective, faces, brand copies or generated text.

- `study.svg`: connected database tables; used for class context and authentication.
- `learn.svg`: open notebook; used for the ordered material path and teacher overview.
- `forum.svg`: flat conversation symbols; used for the honest forum placeholder.
- `attend.svg`: attendance receipt/check inside a viewfinder; used for the scan action and real attendance receipt. It is a decorative symbol, never a fake QR code.

The adjacent UI text owns the accessible meaning; assets are excluded from the accessibility tree. All four use a160×160 viewBox, flat fills and a consistent 2–6 unit stroke hierarchy so they remain clear at96–120dp.

Edit the SVG files, then run `node scripts/sync-learning-art.mjs`. This generates `index.ts`, used synchronously by `SvgXml` in `src/components/LearningArt.tsx`. The source `<title>` metadata is omitted from the native rendering strings. No network image fetch or extra native module is required.

The earlier AI-generated 3D PNG drafts were rejected and removed from this project's assets and rendering path. These final assets are deterministic editable vector sources. Research references and visual intent are recorded in `.impeccable/briefs/mobile-visual-refresh.md`.
