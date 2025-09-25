import * as vscode from 'vscode';
import * as path from 'path';

// Constants for maintainability and localization
const CONSTANTS = {
    COMMANDS: {
        COPY_FILE: 'clipboard-copy.copyFileToClipboard',
        COPY_FOLDER: 'clipboard-copy.copyFolderToClipboard'
    },
    CONFIG: {
        NAMESPACE: 'clipboard-copy',
        ALLOWED_FILE_PATTERNS: 'allowedFilePatterns'
    },
    MESSAGES: {
        NO_FILES_SELECTED: 'No files selected',
        NO_FOLDER_SELECTED: 'No folder selected',
        NO_PATTERNS_SPECIFIED: 'No file patterns specified',
        NO_MATCHING_FILES: 'No selected files match the specified patterns',
        NO_MATCHING_FOLDER_FILES: 'No files found matching the specified patterns',
        INVALID_PATTERNS: 'Invalid file patterns provided',
        OPERATION_CANCELLED: 'Operation cancelled by user',
        COPY_FAILED: 'Failed to copy files',
        READ_FAILED: 'Failed to read some files',
        INVALID_RESOURCE_TYPE: 'Invalid resource type for this operation'
    },
    DEFAULTS: {
        FILE_PATTERNS: '*.py,*.js,*.ts'
    }
} as const;

// Input validation for file patterns - prevents malicious patterns
function validateFilePatterns(patterns: string): boolean {
    if (!patterns || patterns.trim() === '') {
        return false;
    }

    // Allow only safe glob patterns - alphanumeric, dots, asterisks, commas, and basic path separators
    // Reject dangerous patterns that could access parent directories or system files
    const safePatternRegex = /^[a-zA-Z0-9*.,_/-]+$/;
    const parts = patterns.split(',').map(p => p.trim());

    for (const pattern of parts) {
        if (!pattern || !safePatternRegex.test(pattern)) {
            return false;
        }
        // Explicitly reject patterns that try to escape the workspace
        if (pattern.includes('..') || pattern.startsWith('/') || pattern.includes('~')) {
            return false;
        }
    }

    return true;
}

// Get file patterns from configuration or user input with validation
async function getFilePatterns(): Promise<string[] | undefined> {
    const config = vscode.workspace.getConfiguration(CONSTANTS.CONFIG.NAMESPACE);
    let patterns = config.get<string>(CONSTANTS.CONFIG.ALLOWED_FILE_PATTERNS);

    if (!patterns || patterns.trim() === '') {
        patterns = await vscode.window.showInputBox({
            prompt: 'Enter file patterns to copy (comma-separated)',
            placeHolder: CONSTANTS.DEFAULTS.FILE_PATTERNS,
            value: CONSTANTS.DEFAULTS.FILE_PATTERNS,
            validateInput: (value: string) => {
                return validateFilePatterns(value) ? null : 'Invalid file patterns. Use only alphanumeric characters, dots, asterisks, and basic path separators.';
            }
        });
    }

    if (!patterns || !validateFilePatterns(patterns)) {
        vscode.window.showErrorMessage(CONSTANTS.MESSAGES.INVALID_PATTERNS);
        return undefined;
    }

    return patterns.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

/**
 * Cross-platform file pattern matching using enhanced glob support
 *
 * Supported patterns:
 * - * : matches any characters except path separators
 * - ? : matches any single character
 * - [abc] : matches any character in the brackets
 * - [a-z] : matches any character in the range
 * - *.{js,ts} : matches files with .js or .ts extensions
 *
 * Note: Complex patterns like ** (recursive) and !(negation) are handled
 * by VS Code's findFiles API in folder operations, not by this function.
 */
function matchesPattern(filePath: string, patterns: string[]): boolean {
    // Use path.basename for cross-platform file name extraction
    const fileName = path.basename(filePath);

    return patterns.some(pattern => {
        // Handle brace expansion {js,ts,py} manually since it's commonly used
        if (pattern.includes('{') && pattern.includes('}')) {
            const braceMatch = pattern.match(/^(.+)\{([^}]+)\}(.*)$/);
            if (braceMatch) {
                const [, prefix, options, suffix] = braceMatch;
                const expandedPatterns = options.split(',').map(opt => `${prefix}${opt.trim()}${suffix}`);
                return expandedPatterns.some(expandedPattern =>
                    matchesSinglePattern(fileName, expandedPattern)
                );
            }
        }

        return matchesSinglePattern(fileName, pattern);
    });
}

/**
 * Helper function to match a single pattern against a filename
 */
function matchesSinglePattern(fileName: string, pattern: string): boolean {
    // Convert glob pattern to regex with proper handling of special characters
    let regexPattern = pattern
        .replace(/\./g, '\\.')           // Escape literal dots
        .replace(/\?/g, '.')             // ? matches single character
        .replace(/\*/g, '.*');           // * matches any characters

    // Handle character classes [abc] and ranges [a-z]
    regexPattern = regexPattern.replace(/\[([^\]]+)\]/g, '[$1]');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(fileName);
}

/**
 * Reusable file filtering function that filters files by patterns
 */
function filterFilesByPatterns(files: vscode.Uri[], patterns: string[]): vscode.Uri[] {
    return files.filter(fileUri => {
        const relativePath = vscode.workspace.asRelativePath(fileUri);
        return matchesPattern(relativePath, patterns);
    });
}

// Validate URI resource type to ensure file vs folder operations are correct
async function validateResourceType(uri: vscode.Uri, expectedType: 'file' | 'folder'): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(uri);
        const isDirectory = (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;

        if (expectedType === 'folder' && !isDirectory) {
            return false;
        }
        if (expectedType === 'file' && isDirectory) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

// Concurrent file reading for better performance with detailed error reporting
async function readFilesContent(files: vscode.Uri[]): Promise<{
    content: string,
    errors: number,
    failedFiles: string[]
}> {
    const fileReadPromises = files.map(async (file) => {
        try {
            const fileData = await vscode.workspace.fs.readFile(file);
            const content = new TextDecoder().decode(fileData);
            const relativePath = vscode.workspace.asRelativePath(file);

            return {
                success: true,
                content: files.length > 1
                    ? `--- File: ${relativePath} ---\n${content}\n\n`
                    : content,
                fileName: relativePath
            };
        } catch {
            const relativePath = vscode.workspace.asRelativePath(file);
            return {
                success: false,
                content: '',
                fileName: relativePath
            };
        }
    });

    const results = await Promise.all(fileReadPromises);
    const successfulReads = results.filter(r => r.success);
    const failedReads = results.filter(r => !r.success);

    const concatenatedContent = successfulReads.map(r => r.content).join('');
    const failedFiles = failedReads.map(r => r.fileName);

    return {
        content: concatenatedContent,
        errors: failedReads.length,
        failedFiles
    };
}

// Optimized glob pattern processing with single findFiles call
async function processGlobPatterns(uri: vscode.Uri, patterns: string[], isRecursive: boolean): Promise<vscode.Uri[]> {
    try {
        // Combine patterns for efficient single search
        const adjustedPatterns = patterns.map(pattern =>
            isRecursive ? `**/${pattern}` : pattern
        );

        // Use brace expansion syntax for multiple patterns in single call
        const combinedPattern = adjustedPatterns.length > 1
            ? `{${adjustedPatterns.join(',')}}`
            : adjustedPatterns[0];

        const files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(uri, combinedPattern)
        );

        // Normalize paths for cross-platform deduplication (handle case sensitivity)
        const uniqueFiles = new Map<string, vscode.Uri>();
        for (const file of files) {
            const normalizedPath = file.fsPath.toLowerCase();
            if (!uniqueFiles.has(normalizedPath)) {
                uniqueFiles.set(normalizedPath, file);
            }
        }

        return Array.from(uniqueFiles.values());
    } catch {
        // Fallback to individual pattern processing if brace expansion fails
        const allFiles: vscode.Uri[] = [];
        for (const pattern of patterns) {
            try {
                const adjustedPattern = isRecursive ? `**/${pattern}` : pattern;
                const files = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(uri, adjustedPattern)
                );
                allFiles.push(...files);
            } catch {
                // Skip invalid patterns silently
            }
        }

        // Deduplicate with normalized paths
        const uniqueFiles = new Map<string, vscode.Uri>();
        for (const file of allFiles) {
            const normalizedPath = file.fsPath.toLowerCase();
            if (!uniqueFiles.has(normalizedPath)) {
                uniqueFiles.set(normalizedPath, file);
            }
        }

        return Array.from(uniqueFiles.values());
    }
}

export function activate(context: vscode.ExtensionContext) {
    const copyFileCommand = vscode.commands.registerCommand(
        CONSTANTS.COMMANDS.COPY_FILE,
        copyFileToClipboard
    );
    const copyFolderCommand = vscode.commands.registerCommand(
        CONSTANTS.COMMANDS.COPY_FOLDER,
        copyFolderToClipboard
    );

    context.subscriptions.push(copyFileCommand, copyFolderCommand);
}

async function copyFileToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const selectedFiles = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (selectedFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FILES_SELECTED);
            return;
        }

        // Validate that selected resources are actually files
        for (const fileUri of selectedFiles) {
            const isValidFile = await validateResourceType(fileUri, 'file');
            if (!isValidFile) {
                vscode.window.showErrorMessage(CONSTANTS.MESSAGES.INVALID_RESOURCE_TYPE);
                return;
            }
        }

        const patterns = await getFilePatterns();
        if (!patterns || patterns.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_PATTERNS_SPECIFIED);
            return;
        }

        // Filter selected files based on patterns using reusable function
        const filteredFiles = filterFilesByPatterns(selectedFiles, patterns);

        if (filteredFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_MATCHING_FILES);
            return;
        }

        const { content, errors, failedFiles } = await readFilesContent(filteredFiles);

        if (content) {
            await vscode.env.clipboard.writeText(content);

            const successMessage = filteredFiles.length === 1
                ? `File content copied to clipboard`
                : `${filteredFiles.length} files copied to clipboard${selectedFiles.length > filteredFiles.length ? ` (${selectedFiles.length - filteredFiles.length} filtered out)` : ''}`;

            if (errors > 0) {
                const failedFilesList = failedFiles.length <= 3
                    ? failedFiles.join(', ')
                    : `${failedFiles.slice(0, 3).join(', ')} and ${failedFiles.length - 3} more`;
                vscode.window.showWarningMessage(`${successMessage}. Could not read: ${failedFilesList}`);
            } else {
                vscode.window.showInformationMessage(successMessage);
            }
        } else {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.READ_FAILED);
        }
    } catch {
        // Generic error message to prevent information leakage
        vscode.window.showErrorMessage(CONSTANTS.MESSAGES.COPY_FAILED);
    }
}

async function copyFolderToClipboard(uri?: vscode.Uri) {
    try {
        if (!uri) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FOLDER_SELECTED);
            return;
        }

        // Validate that the selected resource is actually a folder
        const isValidFolder = await validateResourceType(uri, 'folder');
        if (!isValidFolder) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.INVALID_RESOURCE_TYPE);
            return;
        }

        const recursiveOption = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Include files from subdirectories' },
                { label: 'No', description: 'Only files in this folder' }
            ],
            {
                placeHolder: 'Copy folder recursively?',
                ignoreFocusOut: true
            }
        );

        // Explicit cancellation handling
        if (!recursiveOption) {
            vscode.window.showInformationMessage(CONSTANTS.MESSAGES.OPERATION_CANCELLED);
            return;
        }

        const isRecursive = recursiveOption.label === 'Yes';

        const patterns = await getFilePatterns();
        if (!patterns || patterns.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_PATTERNS_SPECIFIED);
            return;
        }

        const uniqueFiles = await processGlobPatterns(uri, patterns, isRecursive);

        if (uniqueFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_MATCHING_FOLDER_FILES);
            return;
        }

        const { content, errors, failedFiles } = await readFilesContent(uniqueFiles);

        if (content) {
            await vscode.env.clipboard.writeText(content);

            const successMessage = `${uniqueFiles.length} files copied to clipboard`;
            if (errors > 0) {
                const failedFilesList = failedFiles.length <= 3
                    ? failedFiles.join(', ')
                    : `${failedFiles.slice(0, 3).join(', ')} and ${failedFiles.length - 3} more`;
                vscode.window.showWarningMessage(`${successMessage}. Could not read: ${failedFilesList}`);
            } else {
                vscode.window.showInformationMessage(successMessage);
            }
        } else {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.READ_FAILED);
        }
    } catch {
        // Generic error message to prevent information leakage
        vscode.window.showErrorMessage(CONSTANTS.MESSAGES.COPY_FAILED);
    }
}

export function deactivate() {}