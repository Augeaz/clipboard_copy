# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this VS Code extension repository.

## Project Overview

**ClipboardCopy** is a mature VS Code extension (v0.0.10) that copies file and folder contents to clipboard via Explorer context menu. The 750-line TypeScript codebase emphasizes security hardening, performance optimization, and cross-platform reliability. Dependencies are bundled using esbuild for optimal load performance and VS Code server compatibility.

**Core Features:**
- Context-aware commands that adapt to selection type (single vs multiple items)
- Mixed selection support (files + folders in one operation)
- Multi-folder concurrent processing with deduplication
- Pattern filtering with advanced glob support (`*.{js,ts}`, `[a-z]`)
- **Intelligent exclusions**: Hierarchical `.gitignore` support (respects all .gitignore files in subdirectories), VS Code excludes, and custom patterns
- Security-hardened input validation and path traversal prevention
- Concurrent file processing for performance
- Comprehensive error handling with sanitized messages

## Quick Start

**Development Setup:**
```bash
npm install                # Install dependencies (Node.js 18.x+)
npm run build              # Build with esbuild (development)
npm run package            # Build for production (minified)
F5 in VS Code             # Launch Extension Development Host
```

**Key Commands:**
- `copyFileToClipboard` - Copy single file with pattern filtering
- `copyFolderToClipboard` - Copy single folder contents with recursive options
- `copyContentToClipboard` - Copy multiple items (files/folders/mixed) with smart processing

**Configuration:**
- `clipboard-copy.allowedFilePatterns`: File patterns (default: `*.py,*.js,*.ts`)
- `clipboard-copy.respectGitignore`: Respect .gitignore files (default: `true`)
- `clipboard-copy.respectVSCodeExcludes`: Respect VS Code exclude settings (default: `true`)
- `clipboard-copy.customExcludePatterns`: Custom exclude patterns (default: `""`)

## Architecture

**Tech Stack:** VS Code API 1.93.0+, TypeScript 5.5+ (ES2022/Node16), `ignore` library v7.0+, esbuild v0.25+ for bundling

**Key Components:**
- **CONSTANTS**: Centralized strings for maintainability (includes all 3 command IDs + 3 exclude config keys)
- **Security Functions**: Input validation, path traversal prevention
- **Selection Helpers**: `separateFilesAndFolders` - separates mixed URI selections
- **Pattern Matching**: Cross-platform glob support with brace expansion
- **Exclude Filtering**: Three-tier exclusion system with hierarchical .gitignore support
  - `findAllGitignoreFiles()` - Recursively finds all .gitignore files in directory tree (src/extension.ts:238-277)
  - `createHierarchicalIgnore()` - Builds ignore instance with patterns from root to file location (src/extension.ts:286-320)
  - `filterFilesWithGitignore()` - Post-filters files using hierarchical .gitignore rules (src/extension.ts:328-349)
  - `getVSCodeExcludePatterns()` - Extracts VS Code's files.exclude/search.exclude (src/extension.ts:351-381)
  - `buildExcludePattern()` - Combines VS Code excludes and custom patterns (src/extension.ts:383-423)
  - `processGlobPatterns()` - Applies two-phase filtering: VS Code excludes first, then hierarchical .gitignore (src/extension.ts:425-505)
- **File Operations**: Concurrent reading with `Promise.all`, smart error handling
- **Folder Processing**: `processFoldersContent` - multi-folder concurrent processing with deduplication
- **Commands**: 3 context-aware commands with resource type validation and detailed error reporting

## Development Guidelines

**Code Style:**
- ES2022 syntax with strict TypeScript checking
- ES modules (import/export), avoid CommonJS
- Extract strings to `CONSTANTS` for maintainability
- Small, focused functions with single responsibility
- Security-first: validate inputs, sanitize error messages
- JSDoc comments for complex pattern matching functions

**Build Commands:**
- `npm run build` - Build with esbuild (development with sourcemaps)
- `npm run package` - Production build (minified, no sourcemaps)
- `npm run watch-esbuild` - Watch mode with esbuild
- `npm run compile` - TypeScript compilation only (legacy)
- `Ctrl+Shift+F5` - Reload extension in dev host

**Build System:**
- Uses esbuild for bundling all dependencies into single output file
- Production builds are minified and optimized (60% smaller)
- All dependencies (including `ignore` module) are bundled for marketplace compatibility
- No external `node_modules` required at runtime

## Testing

**Setup:** Launch Extension Development Host with `F5`, open folder with mixed file types

**Core Tests:**
1. **Pattern Configuration**: Settings → "clipboard-copy" → Test patterns like `*.{js,ts}`, `*.[ch]`
2. **Single File**: Right-click single file → "Copy File to Clipboard"
3. **Single Folder**: Right-click single folder → "Copy Folder to Clipboard" → Test recursive/non-recursive
4. **Multi-Selection**:
   - Select 3 files → "Copy Content to Clipboard"
   - Select 2 folders → "Copy Content to Clipboard" → Test recursive
   - Select 2 files + 1 folder (mixed) → "Copy Content to Clipboard"

**Exclude Filtering Tests:**
1. **.gitignore Integration**:
   - Create workspace root `.gitignore` with `node_modules/`, `*.log`
   - Copy folder containing these patterns
   - Verify excluded files are skipped
   - **Hierarchical .gitignore**: Create nested `.gitignore` files in subdirectories
   - Verify child .gitignore patterns only apply to their subtree
   - Verify patterns combine correctly (child patterns add to parent patterns)
2. **VS Code Excludes**:
   - Set `files.exclude` with `**/.git`, `**/dist`
   - Copy folder containing these patterns
   - Verify excluded files are skipped
3. **Custom Excludes**:
   - Set `customExcludePatterns` to `*.test.js,temp`
   - Copy folder containing test files and temp directory
   - Verify excluded patterns are skipped
4. **Combined Filtering**:
   - Enable all three exclude mechanisms
   - Verify they work together without conflicts
   - Test disable switches for each mechanism

**Security Tests:**
1. **Input Validation**: Test malicious patterns (`../`, `~/`, `/etc/passwd`)
2. **Error Sanitization**: Verify generic error messages, no path exposure
3. **Resource Validation**: Test wrong command on resource type
4. **.gitignore Path Validation**: Test .gitignore outside workspace (path traversal attack)
5. **Malicious Exclude Patterns**: Test dangerous custom exclude patterns

**Performance Tests:**
1. **Concurrent Processing**: Test 50+ files for timeout/processing issues
2. **Pattern Matching**: Complex patterns on large folders (1000+ files)
3. **Cancellation**: Test operation cancellation with proper user feedback

## Security Architecture

**Input Validation:**
- Pattern sanitization against malicious inputs (`../`, `~/`, absolute paths)
- Safe character set enforcement (alphanumeric, dots, asterisks, commas)
- Real-time validation in VS Code settings
- Custom exclude pattern validation using existing `validateFilePatterns()`

**Resource Protection:**
- URI validation for correct operation types (file vs folder)
- Type checking with `vscode.workspace.fs.stat()` before processing
- Graceful handling of unreadable files
- **.gitignore path validation**: Ensures all .gitignore files (root and subdirectories) are within workspace boundaries

**Error Security:**
- Generic error messages prevent information leakage
- Limited file reporting (max 3 examples, relative paths only)
- Sanitized outputs in all user-facing messages

**Exclude Filtering Security:**
- .gitignore patterns parsed by `ignore` library (battle-tested by ESLint/Prettier)
- Path traversal prevention for all .gitignore file locations (hierarchical validation)
- Safe handling of missing or malformed .gitignore files in any directory
- Custom patterns validated before application

## Project Structure

```
clipboard_copy/
├── src/extension.ts         # Main logic (750 lines) - modular, security-hardened
├── package.json             # Extension manifest v0.0.10, VS Code API 1.93.0+
├── package-lock.json        # Dependency lock file
├── tsconfig.json            # TypeScript ES2022/Node16 configuration
├── esbuild.js               # Build configuration for bundling
├── node_modules/
│   ├── ignore/              # .gitignore parser (v7.0+) - bundled at build
│   └── esbuild/             # Build tool (dev dependency)
├── out/
│   ├── extension.js         # Bundled output with all dependencies (15K minified)
│   └── extension.js.map     # Source map (development only)
├── .vscode/launch.json      # Extension Development Host debug config
├── .vscodeignore            # Files excluded from .vsix package
└── README.md, LICENSE.md    # User documentation, MIT license
```

## Development Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `feature/<desc>` - New features
- `bugfix/<desc>` - Bug fixes
- `security/<desc>` - Security updates

**Commit Prefixes:**
- `[SECURITY]` - Input validation, error sanitization
- `[PERF]` - Performance optimizations
- `[FEAT]` - New functionality
- `[FIX]` - Bug fixes

**Pre-commit Checklist:**
- Run `npm run package` - Ensure production build succeeds
- Test bundled extension works correctly (reload extension host)
- Test security patterns for input-handling changes
- Performance test with large file sets
- Cross-platform testing for path handling changes
- Verify `out/extension.js` contains bundled dependencies (no external requires)