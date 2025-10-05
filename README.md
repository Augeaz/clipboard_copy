# ClipboardCopy

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/AugeazLabs.clipboard-copy?color=blue&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
[![Downloads](https://img.shields.io/vscode-marketplace/d/AugeazLabs.clipboard-copy?color=green)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
[![Rating](https://img.shields.io/vscode-marketplace/r/AugeazLabs.clipboard-copy?color=yellow)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
![License](https://img.shields.io/badge/License-MIT-green)

**Copy file and folder contents to clipboard directly from VS Code Explorer context menu** with enhanced security, performance, and intelligent file pattern filtering.

## ✨ Features

- 📋 **One-Click Copy**: Right-click any file or folder → instant clipboard copy
- 🎯 **Smart Filtering**: Advanced pattern matching (`*.js`, `*.{py,ts}`, `[a-z]*`)
- 🚫 **Intelligent Exclusions**: Hierarchical `.gitignore` support (respects all subdirectory .gitignore files), VS Code excludes, and custom patterns
- 📁 **Bulk Operations**: Copy multiple files and entire folders with sub-directory support
- 🎨 **Context-Aware**: Smart menu labels adapt to your selection (single file/folder vs multiple items)
- 🔄 **Mixed Selections**: Seamlessly handle files and folders together in one operation
- ⚙️ **Configurable**: Set file patterns in VS Code settings or runtime prompts
- 🔒 **Secure**: Input validation prevents malicious patterns and directory traversal
- ⚡ **Fast**: Concurrent processing for optimal performance with multi-folder support
- 🌍 **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

## 🚀 Getting Started

### Installation
Install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy) or:

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions view)
3. Search for "ClipboardCopy"
4. Click Install

### Usage

The extension shows **context-aware commands** based on your selection:

**Single File:**
- Right-click any file in Explorer → **"Copy File to Clipboard"**

**Single Folder:**
- Right-click any folder in Explorer → **"Copy Folder to Clipboard"**
- Choose recursive (with subdirectories) or non-recursive

**Multiple Items** (files, folders, or mixed):
- Select multiple items (Ctrl+click or Shift+click)
- Right-click → **"Copy Content to Clipboard"**
- Processes all files and folders intelligently with pattern filtering

**Configure File Patterns:**
```json
{
    "clipboard-copy.allowedFilePatterns": "*.py,*.js,*.ts,*.md"
}
```

## 🚫 Exclude Filtering

The extension automatically excludes unwanted files using **three smart filtering mechanisms**:

### 1. .gitignore Support (Default: Enabled)
Automatically respects `.gitignore` files **throughout your entire project** (hierarchical support):
- **Workspace root `.gitignore`**: Applies to all files
- **Subdirectory `.gitignore`**: Adds exclusions for that directory and its children
- Patterns combine naturally (child .gitignore patterns add to parent patterns)

Examples of excluded files:
- `node_modules/` → excluded
- `dist/`, `build/` → excluded
- `.env`, `*.log` → excluded

```json
{
    "clipboard-copy.respectGitignore": true  // default
}
```

### 2. VS Code Excludes (Default: Enabled)
Honors VS Code's `files.exclude` and `search.exclude` settings:
```json
{
    "clipboard-copy.respectVSCodeExcludes": true,  // default
    "files.exclude": {
        "**/.git": true,
        "**/node_modules": true
    },
    "search.exclude": {
        "**/dist": true
    }
}
```

### 3. Custom Exclude Patterns
Add your own patterns to exclude:
```json
{
    "clipboard-copy.customExcludePatterns": "*.test.js,*.spec.ts,__pycache__"
}
```

**All three filters work together** to keep unwanted files out of your clipboard!

## 📖 Examples

### Basic File Patterns
```json
// Source code files
"clipboard-copy.allowedFilePatterns": "*.py,*.js,*.ts,*.jsx,*.tsx"

// Documentation files
"clipboard-copy.allowedFilePatterns": "*.md,*.txt,*.rst,*.doc"

// Web development
"clipboard-copy.allowedFilePatterns": "*.html,*.css,*.js,*.json"

// Advanced patterns
"clipboard-copy.allowedFilePatterns": "*.{js,ts},test*.py,src/**/*.md"
```

### Exclude Patterns in Action

**Scenario 1**: Copying a folder with root .gitignore containing `node_modules/` and `*.log`
```
my-project/
├── .gitignore       ← contains: node_modules/, *.log
├── src/
│   ├── app.js
│   └── utils.js
├── node_modules/    ← excluded by .gitignore
│   └── ...
├── debug.log        ← excluded by .gitignore
└── README.md
```
**Result**: Only `src/app.js`, `src/utils.js`, and `README.md` are copied!

**Scenario 2**: Hierarchical .gitignore (subdirectory patterns)
```
my-project/
├── .gitignore       ← contains: *.log
├── src/
│   ├── app.js
│   └── debug.log    ← excluded by root .gitignore
├── tests/
│   ├── .gitignore   ← contains: *.tmp
│   ├── test.js
│   └── temp.tmp     ← excluded by tests/.gitignore
└── README.md
```
**Result**: Copies `src/app.js`, `tests/test.js`, and `README.md` (respects both .gitignore files!)

### Full Configuration Example
```json
{
    // Include patterns (what to copy)
    "clipboard-copy.allowedFilePatterns": "*.js,*.ts,*.py",

    // Exclude patterns (what to skip)
    "clipboard-copy.respectGitignore": true,
    "clipboard-copy.respectVSCodeExcludes": true,
    "clipboard-copy.customExcludePatterns": "*.min.js,*.bundle.js,temp"
}
```

### Pattern Filtering in Action
When you select mixed files like `app.js`, `README.md`, `main.py` with pattern `*.py,*.js`:
- ✅ Copies: `app.js`, `main.py`
- ⚠️ Filters out: `README.md`
- 📋 Result: "2 files copied to clipboard (1 filtered out)"

### Multi-Selection Examples
**Multiple Files (3 .js files):**
- 📋 "3 files copied to clipboard"

**Multiple Folders (2 folders with recursive):**
- 📋 "15 files from 2 folders copied to clipboard"

**Mixed Selection (2 files + 1 folder):**
- 📋 "8 files copied, 5 from 1 folder to clipboard"

## 📋 Output Format

**Single File:**
```
console.log('Hello World');
```

**Multiple Files:**
```
--- File: src/app.js ---
console.log('Hello World');

--- File: src/main.py ---
print('Hello World')
```

## �️ Requirements

- **VS Code**: Version 1.93.0 or higher
- **No additional dependencies** required for end users

## �️ Security & Limitations

**Security Features:**
- Input validation prevents malicious patterns
- No directory traversal attacks (`../`, `~`)
- Safe pattern matching only

**Current Limitations:**
- Pattern matching on file names only (not full paths)
- Binary files copied as text (may appear garbled)
- Basic brace expansion support `{a,b,c}`

## 🤝 Contributing

Contributions welcome! Please see our [GitHub repository](https://github.com/Augeaz/clipboard_copy) for contribution guidelines.

## 📝 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

## 📈 Release Notes

### Latest: Version 0.0.10
- 🌳 **Hierarchical .gitignore Support**: Now respects `.gitignore` files in subdirectories, not just workspace root
- ✨ **Smart Pattern Combining**: Child .gitignore patterns correctly add to parent patterns
- 🔍 **Accurate Filtering**: Uses `ignore` library for proper Git-style pattern matching
- 🔒 **Enhanced Security**: Path validation for all .gitignore files throughout the project
- ⚡ **Optimized Performance**: Two-phase filtering (VS Code excludes → hierarchical .gitignore)

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

---

**⭐ Love this extension?** Please [rate it on the marketplace](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy&ssr=false#review-details) and share with your team!

**🐛 Found an issue?** Report it on [GitHub](https://github.com/Augeaz/clipboard_copy/issues) for quick support.