import * as vscode from 'vscode';
import { LinkerConfig } from './config';
import { RenameHandler } from './renameHandler';
import { Debouncer } from './performance';

let renameHandler: RenameHandler | null = null;
let debouncer: Debouncer | null = null;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Linker extension is activating...');

    try {
        // Initialize configuration
        const config = new LinkerConfig();
        debouncer = new Debouncer();

        // Initialize rename handler
        renameHandler = new RenameHandler(config);

        // Get workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            await renameHandler.initialize(workspaceRoot);
        }

        // Register file rename listener
        const renameDisposable = vscode.workspace.onDidRenameFiles(async (event) => {
            if (!renameHandler) {
                return;
            }

            // Debounce rapid renames
            const debounceDelay = config.getDebounceDelay();
            debouncer?.debounce('rename', async () => {
                await renameHandler!.handleRename(event);
            }, debounceDelay);
        });

        // Register configuration change listener
        const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('linker')) {
                config.reload();
                console.log('Linker: Configuration reloaded');
            }
        });

        context.subscriptions.push(renameDisposable, configChangeDisposable);

        console.log('Linker extension activated successfully');
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
