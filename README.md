# Linker

Linker helps keep imports in sync when files or folders are renamed/moved. It scans your project for import statements referencing the old path, shows a preview, and applies edits when you confirm.

## Usage
1. Install the extension (or run it in dev mode).
2. Rename or move a file in the Explorer.
3. Linker detects the change and opens a Preview panel listing proposed updates.
4. Click **Apply** to perform the edits.

## Settings
- `linker.exclude` — glob patterns to exclude (default: `['**/node_modules/**', '**/.git/**']`)
- `linker.fileExtensions` — file extensions to scan (default: `['js','ts','jsx','tsx']`)

## Limitations
- Heuristic-based import detection; may miss uncommon import styles.
- No git `mv` integration yet.
- Focused on JS/TS/React Native in v1.

## Development

1. Clone the project
2. Run `npm install`
3. Run `npm run build`
4. Press F5 to launch the Extension Development Host
5. Test by renaming files in a JS/TS project

## License

MIT
