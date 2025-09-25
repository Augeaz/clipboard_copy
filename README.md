# ClipboardCopy

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/AugeazLabs.clipboard-copy?color=blue&label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
[![Downloads](https://img.shields.io/vscode-marketplace/d/AugeazLabs.clipboard-copy?color=green)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
[![Rating](https://img.shields.io/vscode-marketplace/r/AugeazLabs.clipboard-copy?color=yellow)](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy)
![License](https://img.shields.io/badge/License-MIT-green)

**Copy file and folder contents to clipboard directly from VS Code Explorer context menu** with enhanced security, performance, and intelligent file pattern filtering.

## ✨ Features

- 📋 **One-Click Copy**: Right-click any file or folder → instant clipboard copy
- 🎯 **Smart Filtering**: Advanced pattern matching (`*.js`, `*.{py,ts}`, `[a-z]*`)
- 📁 **Bulk Operations**: Copy multiple files and entire folders with sub-directory support
- ⚙️ **Configurable**: Set file patterns in VS Code settings or runtime prompts
- � **Secure**: Input validation prevents malicious patterns and directory traversal
- ⚡ **Fast**: Concurrent processing for optimal performance
- � **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux

## 🚀 Getting Started

### Installation
Install directly from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy) or:

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions view)
3. Search for "ClipboardCopy"
4. Click Install

### Usage

**Copy Files:**
- Right-click any file in Explorer → **"Copy File to Clipboard"**

**Copy Folders:**
- Right-click any folder in Explorer → **"Copy Folder to Clipboard"**
- Choose recursive (with subdirectories) or non-recursive

**Configure File Patterns:**
```json
{
    "clipboard-copy.allowedFilePatterns": "*.py,*.js,*.ts,*.md"
}
```

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

### Pattern Filtering in Action
When you select mixed files like `app.js`, `README.md`, `main.py` with pattern `*.py,*.js`:
- ✅ Copies: `app.js`, `main.py`  
- ⚠️ Filters out: `README.md`
- 📋 Result: "2 files copied to clipboard (1 filtered out)"

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

### 🆕 Version 0.0.4
- ✨ Added extension icon and marketplace gallery banner
- 🎨 Improved visual presentation in VS Code marketplace

### Version 0.0.3
- 🔒 Enhanced security with input validation and pattern sanitization
- ⚡ Improved performance with concurrent file processing
- 🎯 Advanced pattern matching with brace expansion support
- 📊 Better error reporting and user feedback

### Version 0.0.2
- 📚 Documentation and publishing improvements

### Version 0.0.1  
- 🎉 Initial release with core copy functionality

---

**⭐ Love this extension?** Please [rate it on the marketplace](https://marketplace.visualstudio.com/items?itemName=AugeazLabs.clipboard-copy&ssr=false#review-details) and share with your team!

**🐛 Found an issue?** Report it on [GitHub](https://github.com/Augeaz/clipboard_copy/issues) for quick support.