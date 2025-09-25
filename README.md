# ClipboardCopy - VS Code Extension

![VS Code](https://img.shields.io/badge/VS%20Code-1.93.0+-007ACC?logo=visual-studio-code&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![Security](https://img.shields.io/badge/Security-Hardened-green)

Copy file and folder contents to clipboard directly from VS Code Explorer context menu with **enhanced security, performance, and intelligent file pattern filtering**.

## ✨ Features

### Core Functionality
- 🎯 **Enhanced Pattern Filtering**: Advanced glob patterns including `*.{js,ts}`, `[a-z]`, and more
- 📁 **File & Folder Support**: Copy single files, multiple selections, or entire folders
- 🔄 **Recursive Options**: Choose recursive or non-recursive folder copying
- ⚙️ **VS Code Integration**: Configure via settings or runtime prompts
- 🖱️ **Explorer Context Menu**: Right-click integration for seamless workflow

### Performance & Reliability
- ⚡ **Concurrent Processing**: Parallel file reading for better performance
- 🔒 **Input Validation**: Security hardened against malicious file patterns
- 📊 **Detailed Feedback**: Smart error reporting with specific failed file names
- 🌐 **Cross-Platform**: Robust path handling for Windows, macOS, and Linux
- 🛡️ **Resource Validation**: Ensures operations are performed on correct file types

### User Experience
- 🎯 **Smart Error Messages**: Helpful feedback without exposing sensitive information
- 📈 **Progress Tracking**: See exactly which files were copied vs filtered out
- 🔄 **Graceful Cancellation**: Clear feedback when operations are cancelled
- 📝 **Brace Expansion**: Support for patterns like `*.{js,ts,py}` for convenience

## 🚀 Quick Start

### Installation
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "ClipboardCopy"
4. Click Install

### Basic Usage
1. **Right-click any file** in Explorer → "Copy File to Clipboard"
2. **Right-click any folder** in Explorer → "Copy Folder to Clipboard"
3. Choose recursive or non-recursive copying
4. Files are copied to clipboard with pattern filtering applied

### Configuration
Configure which file types to include:
1. Open Settings (`Ctrl+,`)
2. Search for "clipboard-copy"
3. Set `allowedFilePatterns` (default: `*.py,*.js,*.ts`)

## 📖 Usage Examples

### File Selection with Pattern Filtering
```bash
# Scenario: Select app.js, README.md, main.py with pattern *.py,*.js
# Result: Only app.js and main.py copied
# Message: "2 files copied to clipboard (1 filtered out)"
```

### Folder Copying
```bash
# Right-click folder → Copy Folder to Clipboard
# Choose: Recursive (includes subdirectories) or Non-recursive (current folder only)
# Only files matching your patterns are included
```

### Multiple File Selection
```bash
# Ctrl+click multiple files in Explorer
# Right-click → Copy File to Clipboard
# Only files matching configured patterns are copied
```

## ⚙️ Configuration

### VS Code Settings
Configure file patterns in your VS Code settings:

```json
{
    "clipboard-copy.allowedFilePatterns": "*.py,*.js,*.ts"
}
```

### Pattern Examples
- **Source code**: `*.py,*.js,*.ts,*.jsx,*.tsx`
- **Documentation**: `*.md,*.txt,*.rst`
- **Web files**: `*.html,*.css,*.js`
- **All text files**: `*.txt,*.md,*.json,*.yml`
- **Brace expansion**: `*.{js,ts}`, `*.{py,pyx,pyi}`
- **Character classes**: `*.[ch]`, `test[0-9].js`

### Runtime Prompting
If no pattern is configured, the extension will prompt you:
- Input box appears: "Enter file patterns to copy"
- Default suggestion: `*.py,*.js,*.ts`
- **Input validation**: Only safe patterns are accepted
- **Security**: Patterns like `../`, `~`, or absolute paths are rejected
- Your input is used for the current operation

## 📋 Output Format

### Single File
```
[Direct file content]
```

### Multiple Files
```
--- File: src/app.js ---
console.log('Hello World');

--- File: src/main.py ---
print('Hello World')

```

## 💻 Development

### Prerequisites
- [Node.js](https://nodejs.org/) (18.x or higher)
- [TypeScript](https://www.typescriptlang.org/) (5.5.0 or higher)
- [VS Code](https://code.visualstudio.com/) (1.93.0 or higher)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd clipboard_copy

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch

# Optional: Publish your extension to the Marketplace
# Ensure you have a Personal Access Token set as VSCE_TOKEN or run `vsce login` first
# Use the command below (optionally specify patch/minor/major)
npx @vscode/vsce publish
```

### Testing
1. Press `F5` in VS Code to launch Extension Development Host
2. Open any folder with mixed file types (.js, .py, .ts, .md, .txt, etc.)
3. Test the extension features:
   - Configure patterns in settings
   - Try file and folder copying
   - Test pattern filtering behavior

### Project Structure
```
clipboard_copy/
├── src/extension.ts          # Main extension logic (395+ lines)
│                            # Enhanced with security, performance, and reliability improvements
├── package.json              # Extension manifest with updated dependencies
├── tsconfig.json            # TypeScript configuration (ES2022/Node16)
├── .vscode/launch.json      # Debug configuration
├── CLAUDE.md               # Development guide and architecture documentation
└── README.md               # This file
```

## 🔧 Requirements

- **VS Code**: Version 1.93.0 or higher
- **Operating System**: Windows, macOS, or Linux
- **No additional dependencies** required for end users

## 🛡️ Security Features

- **Input Sanitization**: All file patterns are validated against malicious inputs
- **Path Validation**: Prevents directory traversal attacks (`../`, `~`, absolute paths)
- **Resource Type Validation**: Ensures operations are performed on correct file/folder types
- **Error Message Sanitization**: Generic error messages prevent information leakage
- **Safe Pattern Matching**: Only alphanumeric, dots, asterisks, and safe characters allowed

## ❓ Known Limitations

- Pattern matching works on file names only (not full paths for security)
- Binary files are copied as text (may result in garbled content)
- Complex glob patterns like `!(negation)` and `**` work in folder search but not file filtering
- Brace expansion supports basic `{a,b,c}` syntax but not nested patterns

## 🤝 Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

Please ensure you test all functionality thoroughly before submitting changes.

## 📝 License

This project is licensed under the MIT License.

## 📈 Changelog

### v0.0.3 (Current)
#### 🔒 Security Enhancements
- ✅ **Input Validation**: Comprehensive pattern sanitization against malicious inputs
- ✅ **Path Security**: Prevention of directory traversal attacks
- ✅ **Resource Validation**: File/folder type verification before operations
- ✅ **Error Sanitization**: Generic error messages to prevent information leakage

#### ⚡ Performance Improvements
- ✅ **Concurrent File Reading**: Parallel processing with `Promise.all` for better performance
- ✅ **Optimized Pattern Processing**: Combined glob patterns in single `findFiles` calls
- ✅ **Cross-platform Deduplication**: Normalized path handling for case sensitivity

#### 🎯 Enhanced Features
- ✅ **Advanced Pattern Matching**: Support for brace expansion `*.{js,ts}` and character classes `[a-z]`
- ✅ **Detailed Error Reporting**: Specific failed file names with smart truncation
- ✅ **Graceful Cancellation**: Clear user feedback for cancelled operations
- ✅ **Reusable Architecture**: Modular functions for better maintainability

#### 🛠️ Technical Updates
- ✅ **VS Code API 1.93.0**: Updated for latest compatibility
- ✅ **TypeScript 5.5**: Modern ES2022/Node16 target
- ✅ **Code Organization**: Constants extraction and function modularization

### v0.0.2
- ✅ Publishing infrastructure and documentation improvements

### v0.0.1
- ✅ Initial release with basic functionality

---

**Made with ❤️ for the VS Code community**

Check the VS Code Extensions Marketplace for updates and support.