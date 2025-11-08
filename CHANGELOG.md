# Changelog

All notable changes to the "Linker" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2025-11-07

### 🎉 Major Features Added - Phase 2 Complete

This release introduces significant enhancements with visual diff preview, undo/redo capabilities, and multi-language support.

#### 🎨 Enhanced Preview UI with Diff View
- Added visual diff preview showing before/after import statements side-by-side
- Support for both **side-by-side** and **inline** diff layouts
- Color-coded changes (red for old, green for new)
- Clickable file names to navigate directly to import locations
- Real-time statistics showing affected files and import count
- Apply/Cancel buttons for convenient workflow
- Configuration: `linker.preview.diffView`, `linker.preview.layout`

#### 🔄 Undo/Redo System
- Complete history management for all import changes
- **Undo** command to revert last import update operation
- **Redo** command to reapply undone changes
- **Show Change History** command to view all past operations
- Configurable history limit (default: 50 entries)
- Timestamp and change count for each history entry
- Configuration: `linker.history.enabled`, `linker.history.maxEntries`

#### 🌍 Multi-Language Support
- **Python** import detection:
  - `import module` statements
  - `from module import items` statements
  - Relative imports (`from ..package import`)
  - Package imports with dot notation
- **Java** import detection:
  - Package import statements
  - Static imports (`import static`)
  - Wildcard imports preserved
- **Go** import detection:
  - Single import statements
  - Import blocks with parentheses
  - Import aliases preserved
- **CSS/SCSS** @import detection:
  - Standard `@import "file.css"` syntax
  - URL syntax `@import url("file.css")`
  - SCSS partials with underscore prefix
- Configuration: `linker.languages.python`, `linker.languages.java`, `linker.languages.go`, `linker.languages.css`

#### ⚙️ Import Formatting Options
- **Quote Style** configuration:
  - Force single quotes (`'`)
  - Force double quotes (`"`)
  - Auto-detect from existing code (default)
- **Semicolon** configuration:
  - Always add semicolons
  - Never add semicolons
  - Auto-detect from existing code (default)
- **Preserve Formatting** option to maintain original style
- Configuration: `linker.formatting.quoteStyle`, `linker.formatting.semicolons`, `linker.formatting.preserveFormatting`

### 🔧 New Commands

- `Linker: Undo Last Import Changes` - Revert the most recent import update
- `Linker: Redo Import Changes` - Reapply the last undone change
- `Linker: Show Change History` - View all past import update operations

### 📦 New Modules

- `diffViewProvider.ts` - WebView-based diff preview UI (350+ lines)
- `historyManager.ts` - Undo/redo system with history tracking (220+ lines)
- `multiLanguageScanner.ts` - Language-specific import scanners (350+ lines)
- `formatter.ts` - Import formatting and style detection (180+ lines)

### ⚙️ New Configuration Options

```json
{
  // Diff View
  "linker.preview.diffView": true,
  "linker.preview.layout": "side-by-side",
  
  // History Management
  "linker.history.enabled": true,
  "linker.history.maxEntries": 50,
  
  // Formatting
  "linker.formatting.quoteStyle": "auto",
  "linker.formatting.semicolons": "auto",
  "linker.formatting.preserveFormatting": false,
  
  // Language Support
  "linker.languages.python": true,
  "linker.languages.java": true,
  "linker.languages.go": true,
  "linker.languages.css": true
}
```

### 📚 Documentation

- Added `Doc/PHASE2-DOCUMENTATION.md` - Comprehensive 25+ page feature guide
- Added `Doc/PHASE2-TESTING.md` - Complete testing guide with 106 test cases
- Updated README with Phase 2 features
- Added migration guide from v1.0.x to v1.1.0

### 🐛 Bug Fixes

- Improved error handling for edge cases in multi-language scanning
- Fixed TypeScript strict mode compilation issues
- Enhanced file encoding detection for non-UTF-8 files

### ⚡ Performance Improvements

- Optimized diff view rendering for large changesets
- Improved history storage efficiency
- Reduced memory footprint for multi-language scanning

### 🔄 Breaking Changes

None - Full backward compatibility with v1.0.x maintained

---

## Version Comparison

| Feature | v1.0.0 | v1.1.0 |
|---------|--------|--------|
| JavaScript/TypeScript Support | ✅ | ✅ |
| Folder Renaming | ✅ | ✅ |
| TypeScript Aliases | ✅ | ✅ |
| Git Integration | ✅ | ✅ |
| Basic Preview | ✅ | ✅ |
| **Visual Diff Preview** | ❌ | ✅ |
| **Undo/Redo** | ❌ | ✅ |
| **Python Support** | ❌ | ✅ |
| **Java Support** | ❌ | ✅ |
| **Go Support** | ❌ | ✅ |
| **CSS/SCSS Support** | ❌ | ✅ |
| **Import Formatting** | ❌ | ✅ |
| **Change History** | ❌ | ✅ |

---

## [1.0.0] - 2025-11-03

### 🎉 Initial Production Release - Phase 1 Complete

This is the first production-ready release of Linker, featuring automatic import updates when renaming or moving files.

### ✨ Added

#### Core Features
- **Automatic Import Updates**: Automatically updates import statements when files are renamed
- **Folder Rename Support**: Handles folder renames with all nested files
- **Preview Dialog**: Shows proposed changes before applying
- **Git Integration**: Optional auto-staging of modified files
- **Multi-Language Support**: JavaScript, TypeScript, JSX, TSX, ESM, CommonJS

#### Import Pattern Support
- ES6 `import` statements
- CommonJS `require()` statements
- Dynamic `import()` statements
- `export ... from` re-exports
- Single and double quote support

#### Performance Optimizations
- File caching system to avoid redundant reads
- Batch processing for large codebases
- Progress reporting for operations with many files
- Smart scanning (only updates files that need changes)

#### Configuration Options
- `linker.autoStageChanges`: Auto-stage modified files in Git (default: `false`)
- `linker.fileExtensions`: File types to scan (default: `["js", "ts", "jsx", "tsx"]`)
- `linker.exclude`: Folders to skip (default: `["**/node_modules/**", "**/.git/**"]`)

#### Documentation
- Complete USER-GUIDE.md with examples
- Updated README.md with quick start guide
- PHASE1-SUMMARY.md with technical details
- Inline code comments and JSDoc documentation

### 🔧 Technical Details

#### Architecture
- **8 Core Modules**:
  - `extension.ts` - Entry point and activation
  - `renameHandler.ts` - Main rename orchestration
  - `importScanner.ts` - Import detection logic
  - `pathUtils.ts` - Path manipulation utilities
  - `aliasResolver.ts` - TypeScript path alias support
  - `gitIntegration.ts` - Git operations
  - `config.ts` - Configuration management
  - `performance.ts` - Caching and batching

#### Code Quality
- TypeScript with strict type checking
- Modular design for maintainability
- Comprehensive error handling
- Clean separation of concerns

### 🐛 Fixed

- **Critical**: Fixed quote handling bug where extra characters were added during replacement
- **Performance**: Optimized file scanning to skip excluded folders
- **UX**: Improved progress messages to show actual files changed vs scanned
- **Git**: Fixed auto-staging to work correctly with renamed files

### 📝 Known Limitations

- Absolute imports are not supported (only relative imports)
- Circular dependencies may cause issues
- Multi-root workspaces not yet supported
- No visual diff in preview (coming in Phase 2)

### 🚀 Performance

- Handles projects with 100+ files efficiently
- Scans ~50-100 files per second
- Memory efficient caching system
- Minimal impact on VS Code performance

---

## Future Releases

### [1.1.0] - Planned
- Enhanced preview UI with diff view
- Better error messages with fix suggestions
- Statistics and analytics dashboard

### [2.0.0] - Phase 2 (Future)
- Multi-root workspace support
- Advanced path alias resolution
- Undo/redo support
- Custom import pattern configuration
- Batch rename operations

---

## How to Update

### From VS Code
1. Open Extensions view (`Ctrl + Shift + X`)
2. Find "Linker"
3. Click **Update** if available

### From Command Line
```bash
code --install-extension linkerdev.import-linker@1.0.0
```

---

## Support

- 🐛 [Report bugs](https://github.com/soumen0818/Linker/issues)
- 💡 [Request features](https://github.com/soumen0818/Linker/issues)
- 📖 [Read documentation](https://github.com/soumen0818/Linker)

---

**[1.0.0]**: https://github.com/soumen0818/Linker/releases/tag/v1.0.0
