# JSON-Viewer.Ru

A fast, lightweight online JSON tool for developers. Self-hosted assets, no framework, no external CDN, no registration required.

**Live:** [https://json-viewer.ru](https://json-viewer.ru)

## Features

- **JSON Editor** — Virtualized syntax highlighting, lossless formatting/minification (numeric literals and duplicate keys preserved), validation with error highlighting, undo/redo and code folding
- **Tree Viewer** — Virtualized collapsible tree with lazy traversal and detailed node information
- **JSON Compare** — Side-by-side semantic diff (key order ignored, arrays compared by index); swap panels, load from main editor or files, copy text report
- **YAML Converter** — Convert JSON to YAML and YAML to JSON, live in both directions; supports block & flow styles, `|`/`>` block scalars, comments, anchors/aliases and merge keys (`<<`), and multi-document streams
- **Schema Generator & Validator** — Auto-generate JSON Schema, edit it, and validate draft-07 / 2020-12 schemas with Ajv; unsupported keywords and unresolved references report errors
- **BSON Converter** — Convert JSON to BSON binary format with size comparison
- **MsgPack Converter** — Convert JSON to MessagePack format with size comparison
- **CBOR Converter** — Convert JSON to CBOR (RFC 8949) binary format with size comparison
- **Dark/Light Theme** — Auto-detects system preference, manually switchable
- **Auto-save** — Editor content persists in localStorage

## Usage

1. Deploy to any PHP-enabled web server
2. Open in browser
3. Paste or type JSON in the editor

Or just use the live version at [json-viewer.ru](https://json-viewer.ru)

## Tech Stack

- HTML, CSS, JavaScript modules; no application framework
- CodeMirror for viewport-based editing; lossless-json for exact numeric values
- Ajv, yaml, BSON, MessagePack and CBOR implementations bundled locally and loaded on demand in a Web Worker
- esbuild for reproducible static assets; Node is only needed for development
- PHP (for dynamic year in footer only)
- Material Design styling
- Local fonts (Roboto, Material Icons)

## Development and checks

Requires Node.js 22 or newer.

```sh
npm ci
npm run check
```

`npm run check` runs static checks, builds `assets/`, and runs regression tests, including the deployed Worker entry and its lazy chunks. `npm run format` formats the sources. Commit the generated `assets/` with source changes. PHP hosting needs no Node.js installation. Deploy the complete assets directory with the updated `index.php`; keep old hashed chunks until cached clients have refreshed.

## Data integrity and resource limits

- Formatting and minification edit JSON tokens, retaining numeric literals, negative zero and duplicate keys. The parsed tree uses the last duplicate key, matching native JSON semantics. Compare evaluates exact numeric values rather than rounding them to JavaScript numbers.
- Schema validation and binary/JSON-to-YAML encoding explicitly reject numbers their native number model cannot represent exactly. They never silently round them. YAML integers and decoded binary int64 values are preserved when exported to JSON. Non-JSON values (including non-finite numbers and cyclic aliases) report errors.
- BSON requires an object at the root. Decoders reject truncated input and trailing bytes. CBOR float16 is supported. Dangerous property names are retained as own properties.
- YAML parsing supports multi-document streams, anchors, merge keys, block and flow styles. Alias expansion is limited to 100; converted values are limited to one million nodes and 256 levels. Operations have a 15-second Worker budget; a timed-out worker is terminated and recreated for the next operation.
- Binary previews show the first 4096 bytes; Copy and Save export the complete result. Tree rendering and editor highlighting remain virtualized when documents grow.
- Document contents stay in the browser; processing makes no server requests. The existing analytics script remains separate from document processing.

## Author

**Igor Solkin**
- GitHub: [github.com/solkin/json-viewer](https://github.com/solkin/json-viewer)
- Email: i.solkin@gmail.com

## License

MIT
