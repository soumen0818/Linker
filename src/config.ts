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
        return this.config.get('exclude', [
            '**/node_modules/**',
            '**/.git/**',
            '**/dist/**',
            '**/build/**',
            '**/out/**',
            '**/.next/**',
            '**/coverage/**',
            '**/vendor/**',
            '**/*.min.js',
            '**/*.min.css',
            '**/*.bundle.js'
        ]);
    }

    /**
     * Get file extensions to scan for imports
     */
    getFileExtensions(): string[] {
        return this.config.get('fileExtensions', [
            'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs',  // JavaScript/TypeScript
            'py',                                      // Python
            'go',                                      // Go
            'css', 'scss', 'less'                     // CSS
        ]);
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
     * Get whether to auto-apply import updates without preview
     * When true, updates are applied atomically with the rename (faster, prevents conflicts)
     * When false, shows preview dialog for confirmation (safer, more control)
     */
    autoApply(): boolean {
        return this.config.get('autoApply', true);
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
        return this.config.get('performance.maxConcurrentFiles', 20);
    }

    /**
     * Get debounce delay in milliseconds
     */
    getDebounceDelay(): number {
        return this.config.get('performance.debounceMs', 300);
    }

    /**
     * Get maximum number of files to scan (for large codebases)
     */
    getMaxFilesToScan(): number {
        return this.config.get('performance.maxFilesToScan', 10000);
    }

    /**
     * Get operation timeout in milliseconds
     */
    getOperationTimeout(): number {
        return this.config.get('performance.operationTimeoutMs', 60000);
    }

    /**
     * Get maximum file size to process in bytes (default 1MB)
     */
    getMaxFileSize(): number {
        return this.config.get('performance.maxFileSizeBytes', 1048576);
    }

    /**
     * Check if smart scanning is enabled (only scan relevant files)
     */
    isSmartScanningEnabled(): boolean {
        return this.config.get('performance.smartScanning', true);
    }

    /**
     * Get whether to enable large codebase optimizations
     */
    enableLargeCodebaseOptimizations(): boolean {
        const mode = this.config.get<string>('performance.largeCodebaseMode', 'auto');
        return mode !== 'disabled';
    }
}
