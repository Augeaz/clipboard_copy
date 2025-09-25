# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "ClipboardCopy" that allows users to copy file and folder contents to the clipboard via Explorer context menu. The extension supports single file copying, multiple file selection, and folder copying (with recursive/non-recursive options).

## Current Implementation Status

The extension is fully implemented and functional with ~90 lines of TypeScript code.

## Architecture

The extension follows standard VS Code extension structure:

- **package.json**: Extension manifest with metadata, commands, and menu contributions
  - Two main commands: `copyFileToClipboard` and `copyFolderToClipboard`
  - Context menu integration in Explorer for files and folders
  - TypeScript compilation and development dependencies
  - Activation event: `onStartupFinished`

- **src/extension.ts**: Main extension logic (90 lines)
  - `copyFileToClipboard`: Supports both single and multiple file selection
    - Single file: copies content directly
    - Multiple files: concatenates with "--- File: path ---" separators
  - `copyFolderToClipboard`: Prompts for recursive/non-recursive copying using `vscode.workspace.findFiles`
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

1. Press `F5` to launch Extension Development Host
2. Open any folder in the new VS Code window
3. Right-click files in Explorer → "Copy File to Clipboard" (supports multi-select)
4. Right-click folders in Explorer → "Copy Folder to Clipboard" → choose recursive/non-recursive

## Key Features Implemented

- **Single file copying**: Direct content copy to clipboard
- **Multiple file selection**: Ctrl+click multiple files, copies all with separators
- **Folder copying**: Recursive and non-recursive options
- **File concatenation format**: "--- File: relativePath ---" separators
- **Cross-platform clipboard support**: Uses VS Code's built-in clipboard API
- **Error handling**: User-friendly notifications for failures

## Project Structure

```
clipboard_copy/
├── .vscode/launch.json      # Debug configuration
├── src/extension.ts         # Main extension logic (90 lines)
├── out/extension.js         # Compiled JavaScript
├── package.json             # Extension manifest
├── tsconfig.json           # TypeScript configuration
├── .gitignore              # Git ignore rules
└── docs/prd.md             # Original product requirements
```