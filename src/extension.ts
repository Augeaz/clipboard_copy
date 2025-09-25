import * as vscode from 'vscode';

async function getFilePatterns(): Promise<string[] | undefined> {
    const config = vscode.workspace.getConfiguration('clipboard-copy');
    let patterns = config.get<string>('allowedFilePatterns');

    if (!patterns || patterns.trim() === '') {
        patterns = await vscode.window.showInputBox({
            prompt: 'Enter file patterns to copy (comma-separated)',
            placeHolder: '*.py,*.js,*.ts',
            value: '*.py,*.js,*.ts'
        });
    }

    if (!patterns || patterns.trim() === '') {
        return undefined;
    }

    return patterns.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

function matchesPattern(filePath: string, patterns: string[]): boolean {
    const fileName = filePath.split('/').pop() || '';

    return patterns.some(pattern => {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\./g, '\\.')  // Escape dots
            .replace(/\*/g, '.*');  // Convert * to .*

        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(fileName);
    });
}

export function activate(context: vscode.ExtensionContext) {
    const copyFileCommand = vscode.commands.registerCommand('clipboard-copy.copyFileToClipboard', copyFileToClipboard);
    const copyFolderCommand = vscode.commands.registerCommand('clipboard-copy.copyFolderToClipboard', copyFolderToClipboard);

    context.subscriptions.push(copyFileCommand, copyFolderCommand);
}

async function copyFileToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const selectedFiles = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (selectedFiles.length === 0) {
            vscode.window.showErrorMessage('No files selected');
            return;
        }

        const patterns = await getFilePatterns();
        if (!patterns || patterns.length === 0) {
            vscode.window.showErrorMessage('No file patterns specified');
            return;
        }

        // Filter selected files based on patterns
        const filteredFiles = selectedFiles.filter(fileUri => {
            const relativePath = vscode.workspace.asRelativePath(fileUri);
            return matchesPattern(relativePath, patterns);
        });

        if (filteredFiles.length === 0) {
            vscode.window.showWarningMessage('No selected files match the specified patterns');
            return;
        }

        let concatenatedContent = '';

        for (const fileUri of filteredFiles) {
            try {
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                const content = new TextDecoder().decode(fileData);

                if (filteredFiles.length > 1) {
                    const relativePath = vscode.workspace.asRelativePath(fileUri);
                    concatenatedContent += `--- File: ${relativePath} ---\n`;
                    concatenatedContent += content;
                    concatenatedContent += '\n\n';
                } else {
                    concatenatedContent = content;
                }
            } catch (fileError) {
                vscode.window.showErrorMessage(`Failed to read file ${fileUri.fsPath}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
            }
        }

        if (concatenatedContent) {
            await vscode.env.clipboard.writeText(concatenatedContent);
            const message = filteredFiles.length === 1
                ? `File content copied to clipboard: ${filteredFiles[0].fsPath}`
                : `${filteredFiles.length} files copied to clipboard (${selectedFiles.length - filteredFiles.length} filtered out)`;
            vscode.window.showInformationMessage(message);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy files: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function copyFolderToClipboard(uri?: vscode.Uri) {
    try {
        if (!uri) {
            vscode.window.showErrorMessage('No folder selected');
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

        if (!recursiveOption) {
            return;
        }

        const isRecursive = recursiveOption.label === 'Yes';

        const patterns = await getFilePatterns();
        if (!patterns || patterns.length === 0) {
            vscode.window.showErrorMessage('No file patterns specified');
            return;
        }

        let allFiles: vscode.Uri[] = [];

        for (const pattern of patterns) {
            try {
                let adjustedPattern: string;
                if (isRecursive) {
                    // For recursive, use **/ prefix to search subdirectories
                    adjustedPattern = `**/${pattern}`;
                } else {
                    // For non-recursive, use pattern as-is (searches only current directory)
                    adjustedPattern = pattern;
                }

                const files = await vscode.workspace.findFiles(
                    new vscode.RelativePattern(uri, adjustedPattern)
                );
                allFiles.push(...files);
            } catch (patternError) {
                console.warn(`Failed to process pattern ${pattern}:`, patternError);
            }
        }

        const uniqueFiles = [...new Map(allFiles.map(file => [file.fsPath, file])).values()];

        if (uniqueFiles.length === 0) {
            vscode.window.showWarningMessage('No files found matching the specified patterns');
            return;
        }

        let concatenatedContent = '';

        for (const file of uniqueFiles) {
            try {
                const fileData = await vscode.workspace.fs.readFile(file);
                const content = new TextDecoder().decode(fileData);
                const relativePath = vscode.workspace.asRelativePath(file);

                concatenatedContent += `--- File: ${relativePath} ---\n`;
                concatenatedContent += content;
                concatenatedContent += '\n\n';
            } catch (fileError) {
                console.warn(`Failed to read file ${file.fsPath}:`, fileError);
            }
        }

        if (concatenatedContent) {
            await vscode.env.clipboard.writeText(concatenatedContent);
            vscode.window.showInformationMessage(`${uniqueFiles.length} files copied to clipboard from: ${uri.fsPath}`);
        } else {
            vscode.window.showErrorMessage('No files could be read from the selected folder');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function deactivate() {}