import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const copyFileCommand = vscode.commands.registerCommand('clipboard-copy.copyFileToClipboard', copyFileToClipboard);
    const copyFolderCommand = vscode.commands.registerCommand('clipboard-copy.copyFolderToClipboard', copyFolderToClipboard);

    context.subscriptions.push(copyFileCommand, copyFolderCommand);
}

async function copyFileToClipboard(uri?: vscode.Uri, uris?: vscode.Uri[]) {
    try {
        const filesToProcess = uris && uris.length > 0 ? uris : uri ? [uri] : [];

        if (filesToProcess.length === 0) {
            vscode.window.showErrorMessage('No files selected');
            return;
        }

        let concatenatedContent = '';

        for (const fileUri of filesToProcess) {
            try {
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                const content = new TextDecoder().decode(fileData);

                if (filesToProcess.length > 1) {
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
            const message = filesToProcess.length === 1
                ? `File content copied to clipboard: ${filesToProcess[0].fsPath}`
                : `${filesToProcess.length} files copied to clipboard`;
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

        let files: vscode.Uri[];
        if (isRecursive) {
            files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(uri, '**/*')
            );
        } else {
            files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(uri, '*')
            );
        }

        if (files.length === 0) {
            vscode.window.showWarningMessage('No files found in the selected folder');
            return;
        }

        let concatenatedContent = '';

        for (const file of files) {
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
            vscode.window.showInformationMessage(`${files.length} files copied to clipboard from: ${uri.fsPath}`);
        } else {
            vscode.window.showErrorMessage('No files could be read from the selected folder');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy folder: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function deactivate() {}