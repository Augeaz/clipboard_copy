# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "ClipboardCopy" that allows users to copy file and folder contents to the clipboard via Explorer context menu. The extension supports single file copying, multiple file selection, and folder copying (with recursive/non-recursive options).

Key feature: **Configurable file pattern filtering** - users can specify which file types to include (e.g., `*.py,*.js,*.ts`) via VS Code settings or runtime prompts. Pattern filtering applies to both individual file selection and folder copying operations.

## Current Implementation Status

The extension is fully implemented and functional with ~186 lines of TypeScript code. Recent enhancements include configurable file pattern filtering, VS Code settings integration, and enhanced user feedback for filtered operations.

## Architecture

The extension follows standard VS Code extension structure:

- **package.json**: Extension manifest with metadata, commands, and menu contributions
  - Two main commands: `copyFileToClipboard` and `copyFolderToClipboard`
  - Context menu integration in Explorer for files and folders
  - **Configuration section**: `clipboard-copy.allowedFilePatterns` setting
    - Default: `*.py,*.js,*.ts` (comma-separated patterns)
    - Type: string with user-friendly format
  - TypeScript compilation and development dependencies
  - Activation event: `onStartupFinished`

- **src/extension.ts**: Main extension logic (186 lines)
  - **Helper functions**:
    - `getFilePatterns()`: Reads VS Code settings or prompts user for patterns
    - `matchesPattern()`: Converts glob patterns to regex for file matching
  - `copyFileToClipboard`: Supports pattern-filtered single and multiple file selection
    - Filters selected files based on configured patterns
    - Single file: copies content directly
    - Multiple files: concatenates with "--- File: path ---" separators
    - Shows filtering statistics in user messages
  - `copyFolderToClipboard`: Pattern-aware recursive/non-recursive folder copying
    - Prompts for recursive/non-recursive option (unchanged UI)
    - Uses multiple `vscode.workspace.findFiles` calls with different patterns
    - Handles recursive (`**/${pattern}`) vs non-recursive (`pattern`) logic
    - Deduplicates files when multiple patterns match same file
  - All clipboard operations via `vscode.env.clipboard.writeText`
  - Comprehensive error handling with VS Code notifications

- **tsconfig.json**: TypeScript configuration targeting ES2020
- **.vscode/launch.json**: Debug configuration for Extension Development Host
- **.gitignore**: Excludes compiled output, dependencies, and packaged extensions

## Development Commands

- `npm install` - Install development dependencies
- `npm run compile` - Compile TypeScript to JavaScript (outputs to `out/`)
- `npm run watch` - Watch mode compilation
- `F5` in VS Code - Launch Extension Development Host for testing

## Testing the Extension

### Basic Setup
1. Press `F5` to launch Extension Development Host
2. Open any folder with mixed file types (.js, .py, .ts, .md, .txt, etc.) in the new VS Code window

### Testing Pattern Configuration
3. **Configure patterns via VS Code settings**:
   - Open Settings (Ctrl+,)
   - Search for "clipboard-copy"
   - Set `allowedFilePatterns` to `*.py,*.js` (or your preferred patterns)

4. **Test file selection with patterns**:
   - Ctrl+click multiple files of different types (e.g., app.js, README.md, main.py)
   - Right-click → "Copy File to Clipboard"
   - Should only copy files matching patterns (app.js, main.py)
   - Message should show: "2 files copied to clipboard (1 filtered out)"

5. **Test folder copying with patterns**:
   - Right-click on a folder → "Copy Folder to Clipboard"
   - Choose recursive/non-recursive
   - Should only copy files matching your configured patterns
   - Message should show count of files found vs filtered

### Testing Pattern Prompting
6. **Clear the setting** (set `allowedFilePatterns` to empty string)
7. **Test runtime prompting**:
   - Try copying files or folders
   - Should prompt with input box: "Enter file patterns to copy"
   - Default value should be `*.py,*.js,*.ts`
   - Test with custom patterns like `*.md,*.txt`

### Testing Edge Cases
8. **Test with no matching files**: Configure patterns like `*.xyz` and try copying
9. **Test single file selection**: Should still respect patterns
10. **Test recursive vs non-recursive**: Verify pattern logic works in both modes

## Key Features Implemented

- **Configurable file pattern filtering**:
  - VS Code setting: `clipboard-copy.allowedFilePatterns` (default: `*.py,*.js,*.ts`)
  - Runtime prompting: If setting is empty, prompts user for patterns
  - Applies to both file selection and folder copying operations
  - Case-insensitive pattern matching (*.JS matches .js files)

- **Single file copying**:
  - Direct content copy to clipboard
  - Pattern filtering applied to selected files

- **Multiple file selection**:
  - Ctrl+click multiple files, copies only those matching patterns
  - Concatenates with "--- File: path ---" separators
  - Shows filtering statistics: "3 files copied (2 filtered out)"

- **Folder copying**:
  - Recursive and non-recursive options (unchanged UI)
  - Smart pattern adjustment: recursive uses `**/${pattern}`, non-recursive uses `pattern`
  - Multiple pattern processing with deduplication
  - Pattern-based file discovery using `vscode.workspace.findFiles`

- **Enhanced user feedback**:
  - Clear messages about filtered vs total file counts
  - Warning when no files match patterns
  - Error handling for invalid patterns or configuration

- **File concatenation format**: "--- File: relativePath ---" separators
- **Cross-platform clipboard support**: Uses VS Code's built-in clipboard API
- **Comprehensive error handling**: User-friendly notifications for all failure scenarios

## Project Structure

```
clipboard_copy/
├── .vscode/launch.json      # Debug configuration
├── src/extension.ts         # Main extension logic (186 lines)
│                           # Includes pattern filtering, helper functions
├── out/extension.js         # Compiled JavaScript
├── package.json             # Extension manifest with configuration schema
├── tsconfig.json           # TypeScript configuration
├── .gitignore              # Git ignore rules
├── CLAUDE.md               # Project documentation and development guide
└── docs/prd.md             # Original product requirements
```