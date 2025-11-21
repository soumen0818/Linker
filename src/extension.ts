import * as vscode from 'vscode';
import { LinkerConfig } from './config';
import { RenameHandler } from './renameHandler';
import { Debouncer } from './performance';
import { DiffViewProvider } from './diffViewProvider';
import { getHistoryManager } from './historyManager';

let renameHandler: RenameHandler | null = null;
let debouncer: Debouncer | null = null;
let diffViewProvider: DiffViewProvider | null = null;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Linker extension is activating (Phase 2)...');

    try {
        // Initialize configuration
        const config = new LinkerConfig();
        debouncer = new Debouncer();

        // Initialize diff view provider (WebviewPanel - no need to register)
        diffViewProvider = new DiffViewProvider(context.extensionUri);

        // Initialize rename handler with diff view provider
        renameHandler = new RenameHandler(config, diffViewProvider);

        // Get workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            await renameHandler.initialize(workspaceRoot);
        }

        // Disable VS Code's built-in import updates to avoid conflicts
        const tsConfig = vscode.workspace.getConfiguration('typescript');
        const jsConfig = vscode.workspace.getConfiguration('javascript');
        const pythonConfig = vscode.workspace.getConfiguration('python');

        await tsConfig.update('updateImportsOnFileMove.enabled', 'never', vscode.ConfigurationTarget.Workspace);
        await jsConfig.update('updateImportsOnFileMove.enabled', 'never', vscode.ConfigurationTarget.Workspace);

        // Disable Python/Pylance auto-import and refactoring features to prevent conflicts
        await pythonConfig.update('analysis.autoImportCompletions', false, vscode.ConfigurationTarget.Workspace);
        await pythonConfig.update('analysis.autoSearchPaths', false, vscode.ConfigurationTarget.Workspace);
        await pythonConfig.update('analysis.fixAll', [], vscode.ConfigurationTarget.Workspace);

        console.log('Linker: Disabled VS Code and Python extension built-in import updates');

        // Show one-time notification about Pylance
        const linkerState = context.globalState;
        const hasShownPylanceNotice = linkerState.get<boolean>('hasShownPylanceNotice', false);
        if (!hasShownPylanceNotice) {
            vscode.window.showInformationMessage(
                'Linker: Disabled Pylance auto-import features to prevent conflicts. Pylance will still provide IntelliSense and type checking.',
                'Got it'
            ).then(() => {
                linkerState.update('hasShownPylanceNotice', true);
            });
        }

        // Register WILL rename listener (BEFORE rename happens)
        // This allows us to provide edits that will be applied atomically with the rename
        // This prevents conflicts with Pylance which also uses willRenameFiles
        const willRenameDisposable = vscode.workspace.onWillRenameFiles((event) => {
            if (!renameHandler) {
                return;
            }

            console.log('Linker: onWillRenameFiles triggered');

            // CRITICAL: waitUntil MUST be called synchronously (not after await)
            // Create the promise immediately and pass it to waitUntil
            const editsPromise = renameHandler.prepareRenameEdits(event);
            event.waitUntil(editsPromise);
        });

        // Also register DID rename listener as fallback for user confirmation flow
        const didRenameDisposable = vscode.workspace.onDidRenameFiles(async (event) => {
            if (!renameHandler) {
                return;
            }

            // ALWAYS handle Git integration (runs after the file has been renamed on disk)
            await renameHandler.handleGitRename(event);

            // Handle rename with user confirmation (only if willRename didn't handle it)
            await renameHandler.handleRenameWithConfirmation(event);
        });

        // Register undo command
        const undoCommand = vscode.commands.registerCommand('linker.undo', async () => {
            const historyManager = getHistoryManager();
            const success = await historyManager.undo();
            if (success) {
                vscode.window.showInformationMessage('Linker: Changes undone successfully');
            }
        });

        // Register redo command
        const redoCommand = vscode.commands.registerCommand('linker.redo', async () => {
            const historyManager = getHistoryManager();
            const success = await historyManager.redo();
            if (success) {
                vscode.window.showInformationMessage('Linker: Changes redone successfully');
            }
        });

        // Register show history command
        const showHistoryCommand = vscode.commands.registerCommand('linker.showHistory', async () => {
            const historyManager = getHistoryManager();
            const summary = historyManager.getHistorySummary();

            const panel = vscode.window.createWebviewPanel(
                'linkerHistory',
                'Linker Change History',
                vscode.ViewColumn.One,
                {}
            );

            panel.webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: var(--vscode-font-family);
                            padding: 20px;
                            color: var(--vscode-foreground);
                        }
                        pre {
                            background: var(--vscode-textBlockQuote-background);
                            padding: 15px;
                            border-radius: 4px;
                            overflow-x: auto;
                        }
                    </style>
                </head>
                <body>
                    <h2>Change History</h2>
                    <pre>${summary}</pre>
                </body>
                </html>
            `;
        });

        // Register configuration change listener
        const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('linker')) {
                config.reload();
                console.log('Linker: Configuration reloaded');
            }
        });

        context.subscriptions.push(
            willRenameDisposable,
            didRenameDisposable,
            configChangeDisposable,
            undoCommand,
            redoCommand,
            showHistoryCommand
        );

        console.log('Linker extension (Phase 2) activated successfully');
    } catch (error) {
        console.error('Failed to activate Linker:', error);
        vscode.window.showErrorMessage(
            `Linker: Activation failed - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export function deactivate() {
    console.log('Linker extension is deactivating...');
    debouncer?.cancelAll();
    renameHandler = null;
    debouncer = null;
}
