# MVP VS Code Extension: ClipboardCopy

## Purpose
Copy contents of selected files or folders (recursively or non-recursively) to clipboard in VS Code, with basic Explorer context menu support. Designed for local workspaces; remote (WSL/SSH) sync via VS Code's built-in clipboard API.

## Extension Structure
- **package.json**:
  - Name: "clipboard-copy"
  - Version: 0.0.1
  - Engines: vscode^1.80.0
  - Contributes:
    - Commands:
      - "clipboard-copy.copyFileToClipboard": "Copy File to Clipboard"
      - "clipboard-copy.copyFolderToClipboard": "Copy Folder to Clipboard"
    - Menus:
      - explorer/context:
        - "clipboard-copy.copyFileToClipboard" (when: resourceScheme == file && resourceLangId != directory)
        - "clipboard-copy.copyFolderToClipboard" (when: resourceScheme == file && resourceLangId == directory)
    - Activation events: onStartupFinished
- **src/extension.ts**:
  - Register commands on activation.
  - **copyFileToClipboard**:
    - Input: Selected file URI (from context menu or command palette).
    - Read file using `vscode.workspace.fs.readFile(uri)`, convert to string with `TextDecoder`.
    - Write to clipboard using `vscode.env.clipboard.writeText(content)`.
  - **copyFolderToClipboard**:
    - Input: Selected folder URI (from context menu or command palette).
    - Prompt user for recursive option (yes/no via `vscode.window.showQuickPick`).
    - Use `vscode.workspace.findFiles` to list files (recursive if selected, else top-level).
    - For each file: Read with `vscode.workspace.fs.readFile`, concat contents with separator (e.g., "--- File: relativePath ---").
    - Write concatenated string to clipboard using `vscode.env.clipboard.writeText`.
  - Error handling: Show notification (`vscode.window.showErrorMessage`) for file read failures.
- **Testing**: Local workspace only. Test single file copy and folder copy (recursive/non-recursive) via context menu.

## MVP Limits
- Basic context menu (Explorer right-click) for files and folders.
- No advanced UI (e.g., settings for separators).
- ~150 LOC total.

## Notes
- Use VS Code Extension API: https://code.visualstudio.com/api
- Ensure compatibility with local file systems; remote clipboard sync relies on VS Code's built-in functionality.