# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "ClipboardCopy" that allows users to copy file and folder contents to the clipboard via Explorer context menu. The extension supports both single file copying and folder copying (with recursive/non-recursive options).

## Architecture

The extension follows standard VS Code extension structure:

- **package.json**: Defines extension metadata, commands, and menu contributions
  - Two main commands: `copyFileToClipboard` and `copyFolderToClipboard`
  - Context menu integration in Explorer for files and folders
  - Activation event: `onStartupFinished`

- **src/extension.ts**: Main extension logic
  - `copyFileToClipboard`: Reads single file content using `vscode.workspace.fs.readFile`
  - `copyFolderToClipboard`: Uses `vscode.workspace.findFiles` to gather files, prompts for recursive option
  - Content concatenation with file separators for folders
  - Clipboard operations via `vscode.env.clipboard.writeText`

## Development Commands

Since this is a VS Code extension project, typical commands would be:
- `npm install` - Install dependencies
- `npm run compile` - Compile TypeScript
- `npm run test` - Run tests
- `F5` in VS Code - Launch Extension Development Host for testing

## Key Design Decisions

- Uses VS Code's built-in filesystem API (`vscode.workspace.fs`) for file operations
- Relies on VS Code's clipboard API for cross-platform clipboard support
- File separator format: "--- File: relativePath ---" for folder content concatenation
- Error handling through VS Code notification system (`vscode.window.showErrorMessage`)
- Target: ~150 LOC total for MVP
- Local workspace focus with remote clipboard sync via VS Code's built-in functionality