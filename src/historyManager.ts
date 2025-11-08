import * as vscode from 'vscode';

/**
 * Represents a single change made to a file
 */
export interface FileChange {
    filePath: string;
    originalContent: string;
    newContent: string;
    timestamp: number;
}

/**
 * Represents a batch of changes (one rename operation)
 */
export interface HistoryEntry {
    id: string;
    description: string;
    changes: FileChange[];
    timestamp: number;
    oldPath: string;
    newPath: string;
}

/**
 * Manages history of import changes for undo/redo functionality
 */
export class HistoryManager {
    private history: HistoryEntry[] = [];
    private currentIndex: number = -1;
    private maxEntries: number = 50;

    constructor() {
        this.loadConfig();
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('linker');
        const enabled = config.get<boolean>('history.enabled', true);
        this.maxEntries = config.get<number>('history.maxEntries', 50);

        if (!enabled) {
            this.history = [];
            this.currentIndex = -1;
        }
    }

    /**
     * Add a new history entry
     */
    public addEntry(entry: HistoryEntry): void {
        const config = vscode.workspace.getConfiguration('linker');
        const enabled = config.get<boolean>('history.enabled', true);

        if (!enabled) {
            return;
        }

        // Remove any entries after current index (when adding after undo)
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add new entry
        this.history.push(entry);
        this.currentIndex++;

        // Maintain max size
        if (this.history.length > this.maxEntries) {
            this.history.shift();
            this.currentIndex--;
        }
    }

    /**
     * Undo the last change
     */
    public async undo(): Promise<boolean> {
        if (!this.canUndo()) {
            vscode.window.showInformationMessage('No changes to undo');
            return false;
        }

        const entry = this.history[this.currentIndex];

        try {
            // Apply original content to all changed files
            for (const change of entry.changes) {
                const uri = vscode.Uri.file(change.filePath);
                const edit = new vscode.WorkspaceEdit();

                // Read current document
                const document = await vscode.workspace.openTextDocument(uri);
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                // Replace with original content
                edit.replace(uri, fullRange, change.originalContent);
                await vscode.workspace.applyEdit(edit);

                // Save the document
                await document.save();
            }

            this.currentIndex--;
            vscode.window.showInformationMessage(
                `Undone: ${entry.description}`
            );
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to undo changes: ${error instanceof Error ? error.message : String(error)}`
            );
            return false;
        }
    }

    /**
     * Redo the last undone change
     */
    public async redo(): Promise<boolean> {
        if (!this.canRedo()) {
            vscode.window.showInformationMessage('No changes to redo');
            return false;
        }

        this.currentIndex++;
        const entry = this.history[this.currentIndex];

        try {
            // Apply new content to all changed files
            for (const change of entry.changes) {
                const uri = vscode.Uri.file(change.filePath);
                const edit = new vscode.WorkspaceEdit();

                // Read current document
                const document = await vscode.workspace.openTextDocument(uri);
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );

                // Replace with new content
                edit.replace(uri, fullRange, change.newContent);
                await vscode.workspace.applyEdit(edit);

                // Save the document
                await document.save();
            }

            vscode.window.showInformationMessage(
                `Redone: ${entry.description}`
            );
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to redo changes: ${error instanceof Error ? error.message : String(error)}`
            );
            this.currentIndex--;
            return false;
        }
    }

    /**
     * Check if undo is available
     */
    public canUndo(): boolean {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is available
     */
    public canRedo(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Get all history entries
     */
    public getHistory(): HistoryEntry[] {
        return [...this.history];
    }

    /**
     * Get current position in history
     */
    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        this.history = [];
        this.currentIndex = -1;
    }

    /**
     * Get history summary for display
     */
    public getHistorySummary(): string {
        if (this.history.length === 0) {
            return 'No history available';
        }

        let summary = `History (${this.currentIndex + 1}/${this.history.length}):\n\n`;

        this.history.forEach((entry, index) => {
            const marker = index === this.currentIndex ? '→ ' : '  ';
            const time = new Date(entry.timestamp).toLocaleString();
            summary += `${marker}${index + 1}. ${entry.description}\n`;
            summary += `   ${entry.oldPath} → ${entry.newPath}\n`;
            summary += `   ${entry.changes.length} file(s) changed - ${time}\n\n`;
        });

        return summary;
    }
}

// Singleton instance
let historyManagerInstance: HistoryManager | null = null;

export function getHistoryManager(): HistoryManager {
    if (!historyManagerInstance) {
        historyManagerInstance = new HistoryManager();
    }
    return historyManagerInstance;
}
