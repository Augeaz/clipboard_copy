import * as vscode from 'vscode';
import * as path from 'path';

// Constants for maintainability and localization
const CONSTANTS = {
    COMMANDS: {
        COPY_FILE: 'clipboard-copy.copyFileToClipboard',
        COPY_FOLDER: 'clipboard-copy.copyFolderToClipboard',
        COPY_CONTENT: 'clipboard-copy.copyContentToClipboard'
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

// Separate files and folders from mixed URI selection
async function separateFilesAndFolders(uris: vscode.Uri[]): Promise<{
    files: vscode.Uri[],
    folders: vscode.Uri[]
}> {
    const files: vscode.Uri[] = [];
    const folders: vscode.Uri[] = [];

    for (const uri of uris) {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            const isDirectory = (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;

            if (isDirectory) {
                folders.push(uri);
            } else {
                files.push(uri);
            }
        } catch {
            // Skip inaccessible resources
        }
    }

    return { files, folders };
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

// Process multiple folders concurrently and deduplicate across all results
async function processFoldersContent(folders: vscode.Uri[], patterns: string[], isRecursive: boolean): Promise<vscode.Uri[]> {
    // Process all folders concurrently for better performance
    const folderResults = await Promise.all(
        folders.map(folder => processGlobPatterns(folder, patterns, isRecursive))
    );

    // Combine and deduplicate files across all folders
    const uniqueFiles = new Map<string, vscode.Uri>();
    for (const folderFiles of folderResults) {
        for (const file of folderFiles) {
            const normalizedPath = file.fsPath.toLowerCase();
            if (!uniqueFiles.has(normalizedPath)) {
                uniqueFiles.set(normalizedPath, file);
            }
        }
    }

    return Array.from(uniqueFiles.values());
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
    const copyContentCommand = vscode.commands.registerCommand(
        CONSTANTS.COMMANDS.COPY_CONTENT,
        copyContentToClipboard
    );

    context.subscriptions.push(copyFileCommand, copyFolderCommand, copyContentCommand);
}

async function copyFileToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const selectedResources = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (selectedResources.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FILES_SELECTED);
            return;
        }

        // Separate files from folders in mixed selection
        const { files: selectedFiles, folders: selectedFolders } = await separateFilesAndFolders(selectedResources);

        // If only folders were selected, suggest using folder command
        if (selectedFiles.length === 0 && selectedFolders.length > 0) {
            vscode.window.showErrorMessage('Only folders selected. Use "Copy Folder to Clipboard" command instead.');
            return;
        }

        if (selectedFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FILES_SELECTED);
            return;
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

            // Build informative success message
            const patternFilteredCount = selectedFiles.length - filteredFiles.length;
            const foldersSkippedCount = selectedFolders.length;

            let successMessage = filteredFiles.length === 1
                ? `File content copied to clipboard`
                : `${filteredFiles.length} files copied to clipboard`;

            // Add information about skipped items
            const skippedParts: string[] = [];
            if (foldersSkippedCount > 0) {
                skippedParts.push(`${foldersSkippedCount} folder${foldersSkippedCount > 1 ? 's' : ''} skipped`);
            }
            if (patternFilteredCount > 0) {
                skippedParts.push(`${patternFilteredCount} file${patternFilteredCount > 1 ? 's' : ''} filtered out`);
            }
            if (skippedParts.length > 0) {
                successMessage += ` (${skippedParts.join(', ')})`;
            }

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

async function copyFolderToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const selectedResources = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (selectedResources.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FOLDER_SELECTED);
            return;
        }

        // Separate folders from files in mixed selection
        const { files: selectedFiles, folders: selectedFolders } = await separateFilesAndFolders(selectedResources);

        // If only files were selected, suggest using file command
        if (selectedFolders.length === 0 && selectedFiles.length > 0) {
            vscode.window.showErrorMessage('Only files selected. Use "Copy File to Clipboard" command instead.');
            return;
        }

        if (selectedFolders.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_FOLDER_SELECTED);
            return;
        }

        const recursiveOption = await vscode.window.showQuickPick(
            [
                { label: 'Yes', description: 'Include files from subdirectories' },
                { label: 'No', description: 'Only files in this folder' }
            ],
            {
                placeHolder: selectedFolders.length === 1
                    ? 'Copy folder recursively?'
                    : `Copy ${selectedFolders.length} folders recursively?`,
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

        const uniqueFiles = await processFoldersContent(selectedFolders, patterns, isRecursive);

        if (uniqueFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_MATCHING_FOLDER_FILES);
            return;
        }

        const { content, errors, failedFiles } = await readFilesContent(uniqueFiles);

        if (content) {
            await vscode.env.clipboard.writeText(content);

            // Build informative success message
            const filesSkippedCount = selectedFiles.length;
            const folderCount = selectedFolders.length;

            let successMessage = `${uniqueFiles.length} files from ${folderCount} folder${folderCount > 1 ? 's' : ''} copied to clipboard`;

            // Add information about skipped files
            if (filesSkippedCount > 0) {
                successMessage += ` (${filesSkippedCount} file${filesSkippedCount > 1 ? 's' : ''} skipped)`;
            }

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

async function copyContentToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const selectedResources = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (selectedResources.length === 0) {
            vscode.window.showErrorMessage('No items selected');
            return;
        }

        // Separate files and folders from the selection
        const { files: selectedFiles, folders: selectedFolders } = await separateFilesAndFolders(selectedResources);

        if (selectedFiles.length === 0 && selectedFolders.length === 0) {
            vscode.window.showErrorMessage('No valid items selected');
            return;
        }

        const patterns = await getFilePatterns();
        if (!patterns || patterns.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_PATTERNS_SPECIFIED);
            return;
        }

        // Collect all files to process
        let allFilesToProcess: vscode.Uri[] = [];

        // Process direct file selections with pattern filtering
        if (selectedFiles.length > 0) {
            const filteredFiles = filterFilesByPatterns(selectedFiles, patterns);
            allFilesToProcess.push(...filteredFiles);
        }

        // Process folders if any
        if (selectedFolders.length > 0) {
            const recursiveOption = await vscode.window.showQuickPick(
                [
                    { label: 'Yes', description: 'Include files from subdirectories' },
                    { label: 'No', description: 'Only files in selected folders' }
                ],
                {
                    placeHolder: selectedFolders.length === 1
                        ? 'Copy folder recursively?'
                        : `Copy ${selectedFolders.length} folders recursively?`,
                    ignoreFocusOut: true
                }
            );

            // Explicit cancellation handling
            if (!recursiveOption) {
                vscode.window.showInformationMessage(CONSTANTS.MESSAGES.OPERATION_CANCELLED);
                return;
            }

            const isRecursive = recursiveOption.label === 'Yes';
            const folderFiles = await processFoldersContent(selectedFolders, patterns, isRecursive);
            allFilesToProcess.push(...folderFiles);
        }

        // Deduplicate in case same file appears in both direct selection and folder content
        const uniqueFiles = new Map<string, vscode.Uri>();
        for (const file of allFilesToProcess) {
            const normalizedPath = file.fsPath.toLowerCase();
            if (!uniqueFiles.has(normalizedPath)) {
                uniqueFiles.set(normalizedPath, file);
            }
        }

        const finalFiles = Array.from(uniqueFiles.values());

        if (finalFiles.length === 0) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_MATCHING_FILES);
            return;
        }

        const { content, errors, failedFiles } = await readFilesContent(finalFiles);

        if (content) {
            await vscode.env.clipboard.writeText(content);

            // Build informative success message
            const parts: string[] = [];

            if (selectedFiles.length > 0 && selectedFolders.length > 0) {
                parts.push(`${finalFiles.length} files copied`);
                const fromFolders = finalFiles.length - filterFilesByPatterns(selectedFiles, patterns).length;
                if (fromFolders > 0) {
                    parts.push(`${fromFolders} from ${selectedFolders.length} folder${selectedFolders.length > 1 ? 's' : ''}`);
                }
            } else if (selectedFolders.length > 0) {
                parts.push(`${finalFiles.length} files from ${selectedFolders.length} folder${selectedFolders.length > 1 ? 's' : ''} copied`);
            } else {
                parts.push(`${finalFiles.length} file${finalFiles.length > 1 ? 's' : ''} copied`);
            }

            const successMessage = parts.join(', ') + ' to clipboard';

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