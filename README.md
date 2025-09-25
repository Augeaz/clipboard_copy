# ClipboardCopy - VS Code Extension

![VS Code](https://img.shields.io/badge/VS%20Code-1.80.0+-007ACC?logo=visual-studio-code&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-4.x-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

Copy file and folder contents to clipboard directly from VS Code Explorer context menu with **configurable file pattern filtering**.

## ✨ Features

- 🎯 **Smart Pattern Filtering**: Configure which file types to copy (e.g., `*.py,*.js,*.ts`)
- 📁 **File & Folder Support**: Copy single files, multiple selections, or entire folders
- 🔄 **Recursive Options**: Choose recursive or non-recursive folder copying
- ⚙️ **VS Code Integration**: Configure via settings or runtime prompts
- 📊 **Smart Feedback**: See how many files were copied vs filtered out
- 🖱️ **Explorer Context Menu**: Right-click integration for seamless workflow
- 🌐 **Cross-Platform**: Works on Windows, macOS, and Linux

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

### Runtime Prompting
If no pattern is configured, the extension will prompt you:
- Input box appears: "Enter file patterns to copy"
- Default suggestion: `*.py,*.js,*.ts`
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
- [Node.js](https://nodejs.org/) (16.x or higher)
- [TypeScript](https://www.typescriptlang.org/) (5.1.6 or higher)
- [VS Code](https://code.visualstudio.com/) (1.80.0 or higher)

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
├── src/extension.ts          # Main extension logic (186 lines)
├── package.json              # Extension manifest with configuration
├── tsconfig.json            # TypeScript configuration
├── .vscode/launch.json      # Debug configuration
└── README.md               # This file
```

## 🔧 Requirements

- **VS Code**: Version 1.80.0 or higher
- **Operating System**: Windows, macOS, or Linux
- **No additional dependencies** required for end users

## ❓ Known Limitations

- Pattern matching is case-insensitive but works on file names only
- Binary files are copied as text (may result in garbled content)
- Very large files may cause performance issues

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

### v0.0.1 (Current)
- ✅ Initial release
- ✅ File and folder copying functionality
- ✅ Configurable pattern filtering
- ✅ VS Code Explorer context menu integration
- ✅ Recursive/non-recursive folder options
- ✅ Enhanced user feedback with filtering statistics

---

**Made with ❤️ for the VS Code community**

Check the VS Code Extensions Marketplace for updates and support.