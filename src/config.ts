import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Configuration manager for Linker extension
 * Handles reading and validating user settings
 */
export class LinkerConfig {
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('linker');
    }

    /**
     * Reload configuration (call after settings change)
     */
    reload(): void {
        this.config = vscode.workspace.getConfiguration('linker');
    }

    /**
     * Get glob patterns to exclude from scanning
     */
    getExcludePatterns(): string[] {
        return this.config.get('exclude', ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']);
    }

    /**
     * Get file extensions to scan for imports
     */
    getFileExtensions(): string[] {
        return this.config.get('fileExtensions', ['js', 'ts', 'jsx', 'tsx']);
    }

    /**
     * Get whether to use git mv for renames
     */
    useGitMv(): boolean {
        return this.config.get('git.useGitMv', true);
    }

    /**
     * Get whether to auto-stage changes after rename
     */
    autoStageChanges(): boolean {
        return this.config.get('git.autoStage', false);
    }

    /**
     * Get whether to show progress notifications
     */
    showProgress(): boolean {
        return this.config.get('showProgress', true);
    }

    /**
     * Get maximum number of files to process concurrently
     */
    getMaxConcurrentFiles(): number {
        return this.config.get('performance.maxConcurrentFiles', 50);
    }

    /**
     * Get debounce delay in milliseconds
     */
    getDebounceDelay(): number {
        return this.config.get('performance.debounceMs', 300);
    }
}
