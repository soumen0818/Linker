# Changelog

## [0.1.2] - 2025-11-02

### Fixed
- **Critical bug fix**: Corrected import path replacement logic that was corrupting import statements with absolute paths
- Improved position calculation using line/column coordinates instead of character offsets
- Fixed Windows vs POSIX path handling in import path computation

## [0.1.1] - 2025-11-02

### Fixed
- Initial bug fix attempt for import path replacement

## [0.1.0] - 2025-11-02

### Added
- Initial release
- Automatic import update detection on file/folder rename
- Preview window before applying changes
- Support for JS, TS, JSX, TSX files
- Configurable exclude patterns and file extensions
