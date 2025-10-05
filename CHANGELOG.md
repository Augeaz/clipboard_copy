# Changelog

All notable changes to the ClipboardCopy extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.10] - 2025-10-05

### Added
- 🌳 **Hierarchical .gitignore Support**: Now respects `.gitignore` files in subdirectories, not just workspace root
- ✨ **Smart Pattern Combining**: Child .gitignore patterns correctly add to parent patterns
- 🔍 **Accurate Filtering**: Uses `ignore` library for proper Git-style pattern matching

### Changed
- ⚡ **Optimized Performance**: Two-phase filtering (VS Code excludes → hierarchical .gitignore)

### Security
- 🔒 **Enhanced Security**: Path validation for all .gitignore files throughout the project

## [0.0.9] - 2025-10-04

### Fixed
- 🔧 **Critical Fix**: Resolved marketplace installation issue where `ignore` module was missing

### Added
- 📦 **Dependency Bundling**: Added esbuild to bundle all dependencies into the extension
- 🚀 **VS Code Server Compatible**: Now works correctly in remote SSH, containers, and WSL environments

### Changed
- ⚡ **Optimized Build**: 60% smaller production bundle with minification
- 🛠️ **Improved Reliability**: Extension loads correctly for all users without external dependencies

## [0.0.8] - 2025-10-04

### Added
- 🚫 **Intelligent Exclusions**: Automatically respect `.gitignore` files
- 🎛️ **VS Code Integration**: Honor `files.exclude` and `search.exclude` settings
- ✨ **Custom Excludes**: Add your own patterns to skip unwanted files
- 📦 **Smart Filtering**: All three exclude mechanisms work together seamlessly

### Security
- 🔒 **Enhanced Security**: Path validation for .gitignore with safe pattern parsing

## [0.0.7] - 2025-10-04

### Added
- 🎨 **Context-Aware Commands**: Menu labels now adapt based on selection type
  - Single file → "Copy File to Clipboard"
  - Single folder → "Copy Folder to Clipboard"
  - Multiple items → "Copy Content to Clipboard"
- 🔄 **Mixed Selection Support**: Copy files and folders together in one operation
- 📁 **Multi-Folder Processing**: Select and copy from multiple folders concurrently

### Changed
- ⚡ **Enhanced Performance**: Optimized handling for bulk operations
- 📊 **Smarter Feedback**: Detailed messages show what was copied and skipped

## [0.0.6] - 2025-10-04

### Changed
- 🔧 Updated dependencies and improved stability

## [0.0.5] - 2025-09-25

### Changed
- 🎨 Extension icon and branding updates

## [0.0.4] - 2025-09-25

### Added
- ✨ Added extension icon and marketplace gallery banner
- 🎨 Improved visual presentation in VS Code marketplace

## [0.0.3] - 2025-09-25

### Added
- 🎯 Advanced pattern matching with brace expansion support
- 📊 Better error reporting and user feedback

### Changed
- ⚡ Improved performance with concurrent file processing

### Security
- 🔒 Enhanced security with input validation and pattern sanitization

## [0.0.2] - 2025-09-25

### Changed
- 📚 Documentation and publishing improvements

## [0.0.1] - 2025-09-25

### Added
- 🎉 Initial release with core copy functionality
