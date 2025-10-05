import * as vscode from 'vscode';
import * as path from 'path';
import ignore from 'ignore';

// Constants for maintainability and localization
const CONSTANTS = {
    COMMANDS: {
        COPY_FILE: 'clipboard-copy.copyFileToClipboard',
        COPY_FOLDER: 'clipboard-copy.copyFolderToClipboard',
        COPY_CONTENT: 'clipboard-copy.copyContentToClipboard'
    },
    CONFIG: {
        NAMESPACE: 'clipboard-copy',
        ALLOWED_FILE_PATTERNS: 'allowedFilePatterns',
        RESPECT_GITIGNORE: 'respectGitignore',
        RESPECT_VSCODE_EXCLUDES: 'respectVSCodeExcludes',
        CUSTOM_EXCLUDE_PATTERNS: 'customExcludePatterns'
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

/**
 * Find all .gitignore files in a directory tree
 * @param rootUri The root directory to search
 * @param workspaceFolder The workspace folder for security validation
 * @returns Map of directory paths to their .gitignore content
 */
async function findAllGitignoreFiles(
    rootUri: vscode.Uri,
    workspaceFolder: vscode.WorkspaceFolder
): Promise<Map<string, string>> {
    const gitignoreMap = new Map<string, string>();

    try {
        // Find all .gitignore files recursively
        const gitignoreFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(rootUri, '**/.gitignore'),
            null // No exclusions - we want to find all .gitignore files
        );

        // Read all .gitignore files concurrently
        const readPromises = gitignoreFiles.map(async (gitignoreUri) => {
            try {
                // Security: Validate that .gitignore is within workspace
                if (!gitignoreUri.fsPath.startsWith(workspaceFolder.uri.fsPath)) {
                    return;
                }

                const gitignoreData = await vscode.workspace.fs.readFile(gitignoreUri);
                const gitignoreContent = new TextDecoder().decode(gitignoreData);

                // Store using directory path (remove .gitignore filename)
                const dirPath = path.dirname(gitignoreUri.fsPath);
                gitignoreMap.set(dirPath, gitignoreContent);
            } catch {
                // Skip unreadable .gitignore files
            }
        });

        await Promise.all(readPromises);
    } catch {
        // If search fails, return empty map
    }

    return gitignoreMap;
}

/**
 * Create ignore instances for all applicable .gitignore files
 * Each .gitignore is kept separate to properly handle patterns with leading /
 * @param filePath The file path to check
 * @param workspaceRoot The workspace root path
 * @param gitignoreMap Map of directory paths to their .gitignore content
 * @param ignoreCache Cache of ignore instances by directory
 * @returns Array of {ignore instance, base directory} pairs
 */
function createHierarchicalIgnoreList(
    filePath: string,
    workspaceRoot: string,
    gitignoreMap: Map<string, string>,
    ignoreCache: Map<string, ReturnType<typeof ignore>>
): Array<{ ig: ReturnType<typeof ignore>; baseDir: string }> {
    const result: Array<{ ig: ReturnType<typeof ignore>; baseDir: string }> = [];

    // Get all directories from workspace root to file's directory
    const fileDir = path.dirname(filePath);
    const relativePath = path.relative(workspaceRoot, fileDir);

    // Build list of directories to check (from root to file's directory)
    const dirsToCheck: string[] = [workspaceRoot];

    if (relativePath && relativePath !== '.') {
        const parts = relativePath.split(path.sep);
        let currentPath = workspaceRoot;

        for (const part of parts) {
            currentPath = path.join(currentPath, part);
            dirsToCheck.push(currentPath);
        }
    }

    // Create separate ignore instance for each .gitignore (with caching)
    for (const dir of dirsToCheck) {
        const gitignoreContent = gitignoreMap.get(dir);
        if (gitignoreContent) {
            // Check cache first
            let ig = ignoreCache.get(dir);
            if (!ig) {
                // Create new instance and cache it
                ig = ignore().add(gitignoreContent);
                ignoreCache.set(dir, ig);
            }
            result.push({ ig, baseDir: dir });
        }
    }

    return result;
}

/**
 * Filter files using hierarchical .gitignore rules
 * Tests each file against each applicable .gitignore separately to properly handle
 * patterns with leading / that are anchored to specific directories
 * @param files The files to filter
 * @param workspaceRoot The workspace root path
 * @param gitignoreMap Map of directory paths to their .gitignore content
 * @returns Filtered files that are not ignored
 */
function filterFilesWithGitignore(
    files: vscode.Uri[],
    workspaceRoot: string,
    gitignoreMap: Map<string, string>
): vscode.Uri[] {
    if (gitignoreMap.size === 0) {
        return files;
    }

    // Cache ignore instances for performance
    const ignoreCache = new Map<string, ReturnType<typeof ignore>>();

    return files.filter(file => {
        // Get all applicable .gitignore instances for this file
        const ignoreList = createHierarchicalIgnoreList(
            file.fsPath,
            workspaceRoot,
            gitignoreMap,
            ignoreCache
        );

        // Test against each .gitignore separately using paths relative to that .gitignore's directory
        for (const { ig, baseDir } of ignoreList) {
            const relativePath = path.relative(baseDir, file.fsPath);
            const normalizedPath = relativePath.split(path.sep).join('/');

            if (ig.ignores(normalizedPath)) {
                // File is ignored by this .gitignore - exclude it
                return false;
            }
        }

        // File is not ignored by any .gitignore - include it
        return true;
    });
}

// Get VS Code's files.exclude and search.exclude patterns
function getVSCodeExcludePatterns(): string[] {
    const patterns: string[] = [];

    try {
        // Get files.exclude settings
        const filesExclude = vscode.workspace.getConfiguration('files').get<Record<string, boolean>>('exclude');
        if (filesExclude) {
            for (const [pattern, enabled] of Object.entries(filesExclude)) {
                if (enabled) {
                    patterns.push(pattern);
                }
            }
        }

        // Get search.exclude settings
        const searchExclude = vscode.workspace.getConfiguration('search').get<Record<string, boolean>>('exclude');
        if (searchExclude) {
            for (const [pattern, enabled] of Object.entries(searchExclude)) {
                if (enabled && !patterns.includes(pattern)) {
                    patterns.push(pattern);
                }
            }
        }
    } catch {
        // Failed to read VS Code settings
    }

    return patterns;
}

// Build combined exclude pattern from VS Code excludes and custom patterns
// Note: .gitignore patterns are now handled separately via hierarchical filtering
async function buildExcludePattern(workspaceFolder?: vscode.WorkspaceFolder): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration(CONSTANTS.CONFIG.NAMESPACE);
    const allPatterns: string[] = [];

    // Load VS Code exclude patterns if enabled
    const respectVSCodeExcludes = config.get<boolean>(CONSTANTS.CONFIG.RESPECT_VSCODE_EXCLUDES, true);
    if (respectVSCodeExcludes) {
        const vscodePatterns = getVSCodeExcludePatterns();
        allPatterns.push(...vscodePatterns);
    }

    // Load custom exclude patterns
    const customExcludePatterns = config.get<string>(CONSTANTS.CONFIG.CUSTOM_EXCLUDE_PATTERNS, '');
    if (customExcludePatterns && customExcludePatterns.trim() !== '') {
        // Validate custom patterns for security
        if (validateFilePatterns(customExcludePatterns)) {
            const customPatterns = customExcludePatterns
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);
            allPatterns.push(...customPatterns);
        }
    }

    // Return undefined if no patterns
    if (allPatterns.length === 0) {
        return undefined;
    }

    // Deduplicate patterns
    const uniquePatterns = Array.from(new Set(allPatterns));

    // Combine into single glob pattern using brace expansion
    if (uniquePatterns.length === 1) {
        return `**/${uniquePatterns[0]}`;
    }

    // Use brace expansion for multiple patterns
    return `**/{${uniquePatterns.join(',')}}`;
}

// Optimized glob pattern processing with single findFiles call
async function processGlobPatterns(uri: vscode.Uri, patterns: string[], isRecursive: boolean): Promise<vscode.Uri[]> {
    try {
        // Get workspace folder for exclude pattern building
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

        // Build exclude pattern from VS Code excludes and custom patterns
        const excludePattern = await buildExcludePattern(workspaceFolder);

        // Combine patterns for efficient single search
        const adjustedPatterns = patterns.map(pattern =>
            isRecursive ? `**/${pattern}` : pattern
        );

        // Use brace expansion syntax for multiple patterns in single call
        const combinedPattern = adjustedPatterns.length > 1
            ? `{${adjustedPatterns.join(',')}}`
            : adjustedPatterns[0];

        let files = await vscode.workspace.findFiles(
            new vscode.RelativePattern(uri, combinedPattern),
            excludePattern
        );

        // Apply hierarchical .gitignore filtering if enabled
        const config = vscode.workspace.getConfiguration(CONSTANTS.CONFIG.NAMESPACE);
        const respectGitignore = config.get<boolean>(CONSTANTS.CONFIG.RESPECT_GITIGNORE, true);
        if (respectGitignore && workspaceFolder) {
            const gitignoreMap = await findAllGitignoreFiles(workspaceFolder.uri, workspaceFolder);
            files = filterFilesWithGitignore(files, workspaceFolder.uri.fsPath, gitignoreMap);
        }

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
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const excludePattern = await buildExcludePattern(workspaceFolder);

        let allFiles: vscode.Uri[] = [];
        for (const pattern of patterns) {
            try {
                const adjustedPattern = isRecursive ? `**/${pattern}` : pattern;
                const files = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(uri, adjustedPattern),
                    excludePattern
                );
                allFiles.push(...files);
            } catch {
                // Skip invalid patterns silently
            }
        }

        // Apply hierarchical .gitignore filtering if enabled
        const config = vscode.workspace.getConfiguration(CONSTANTS.CONFIG.NAMESPACE);
        const respectGitignore = config.get<boolean>(CONSTANTS.CONFIG.RESPECT_GITIGNORE, true);
        if (respectGitignore && workspaceFolder) {
            const gitignoreMap = await findAllGitignoreFiles(workspaceFolder.uri, workspaceFolder);
            allFiles = filterFilesWithGitignore(allFiles, workspaceFolder.uri.fsPath, gitignoreMap);
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