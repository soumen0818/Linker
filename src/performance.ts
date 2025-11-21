import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Cache entry for file content
 */
interface CacheEntry {
    content: string;
    version: number;
    timestamp: number;
}

/**
 * Workspace size analysis result
 */
export interface WorkspaceAnalysis {
    totalFiles: number;
    estimatedRelevantFiles: number;
    isLargeCodebase: boolean;
    recommendedConcurrency: number;
}

/**
 * Analyzes workspace size and recommends optimizations
 */
export class WorkspaceAnalyzer {
    /**
     * Analyze workspace to determine if it's a large codebase
     */
    static async analyzeWorkspace(excludePatterns: string[]): Promise<WorkspaceAnalysis> {
        try {
            const exPattern = '{' + excludePatterns.join(',') + '}';

            // Quick sample - just count relevant files
            const jsFiles = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,mjs,cjs}', exPattern, 1000);
            const pyFiles = await vscode.workspace.findFiles('**/*.py', exPattern, 500);

            const sampleCount = jsFiles.length + pyFiles.length;
            const isLargeCodebase = sampleCount >= 1000; // Hit the limit

            // Estimate total by extrapolation
            const estimatedTotal = isLargeCodebase ? sampleCount * 2 : sampleCount;

            // Recommend concurrency based on size
            let recommendedConcurrency = 20;
            if (isLargeCodebase) {
                if (estimatedTotal > 5000) {
                    recommendedConcurrency = 10; // Very large - use low concurrency
                } else {
                    recommendedConcurrency = 15; // Large - use medium concurrency
                }
            }

            // Warn if workspace is extremely large
            if (estimatedTotal > 20000) {
                vscode.window.showWarningMessage(
                    `Linker: Very large workspace detected (~${estimatedTotal} files). ` +
                    `Performance may be impacted. Consider excluding more directories or using workspace-specific settings.`,
                    'Configure Settings',
                    'Dismiss'
                ).then(action => {
                    if (action === 'Configure Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'linker');
                    }
                });
            }

            return {
                totalFiles: estimatedTotal,
                estimatedRelevantFiles: sampleCount,
                isLargeCodebase,
                recommendedConcurrency
            };
        } catch (error) {
            console.error('Linker: Failed to analyze workspace', error);
            return {
                totalFiles: 0,
                estimatedRelevantFiles: 0,
                isLargeCodebase: false,
                recommendedConcurrency: 20
            };
        }
    }
}

/**
 * Timeout wrapper for operations
 */
export class TimeoutHandler {
    /**
     * Run operation with timeout
     */
    static async withTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        errorMessage: string = 'Operation timed out'
    ): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(errorMessage));
            }, timeoutMs);

            operation()
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }
}

/**
 * Performance-optimized file cache
 * Caches file contents to avoid repeated reads
 */
export class FileCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxCacheSize: number = 1000;
    private maxCacheAge: number = 5 * 60 * 1000; // 5 minutes

    /**
     * Get cached document or read from disk
     */
    async getDocument(uri: vscode.Uri): Promise<vscode.TextDocument> {
        return await vscode.workspace.openTextDocument(uri);
    }

    /**
     * Get file content from cache or disk
     */
    async getContent(uri: vscode.Uri): Promise<string> {
        const key = uri.toString();
        const cached = this.cache.get(key);

        // Return cached if valid
        if (cached && this.isCacheValid(cached)) {
            return cached.content;
        }

        // Read from disk
        const doc = await vscode.workspace.openTextDocument(uri);
        const content = doc.getText();

        // Update cache
        this.cache.set(key, {
            content,
            version: doc.version,
            timestamp: Date.now()
        });

        // Cleanup old entries if cache is too large
        this.cleanup();

        return content;
    }

    /**
     * Invalidate cache entry
     */
    invalidate(uri: vscode.Uri): void {
        this.cache.delete(uri.toString());
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Check if cache entry is still valid
     */
    private isCacheValid(entry: CacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.maxCacheAge;
    }

    /**
     * Cleanup old cache entries
     */
    private cleanup(): void {
        if (this.cache.size <= this.maxCacheSize) {
            return;
        }

        // Remove oldest entries
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
        for (const [key] of toRemove) {
            this.cache.delete(key);
        }
    }
}

/**
 * Debouncer for handling rapid file rename events
 */
export class Debouncer {
    private timers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Debounce a function call
     */
    debounce<T extends (...args: any[]) => any>(
        key: string,
        fn: T,
        delay: number
    ): void {
        // Clear existing timer
        const existing = this.timers.get(key);
        if (existing) {
            clearTimeout(existing);
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.timers.delete(key);
            fn();
        }, delay);

        this.timers.set(key, timer);
    }

    /**
     * Cancel all pending debounced calls
     */
    cancelAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}

/**
 * Progress reporter for long-running operations
 */
export class ProgressReporter {
    /**
     * Run an operation with progress notification
     */
    static async withProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        );
    }

    /**
     * Report progress for scanning files
     */
    static reportScanProgress(
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        current: number,
        total: number
    ): void {
        const percentage = Math.floor((current / total) * 100);
        progress.report({
            message: `Scanning files (${current}/${total})`,
            increment: (1 / total) * 100
        });
    }
}

/**
 * Batch processor for handling large number of files
 */
export class BatchProcessor {
    /**
     * Process items in batches
     */
    static async processBatch<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        batchSize: number = 50
    ): Promise<R[]> {
        const results: R[] = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(processor));
            results.push(...batchResults);
        }

        return results;
    }

    /**
     * Process items with concurrency limit and cancellation support
     */
    static async processWithLimit<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        limit: number = 10,
        cancellationToken?: vscode.CancellationToken
    ): Promise<R[]> {
        const results: R[] = [];
        const executing: Map<Promise<void>, boolean> = new Map();

        for (let i = 0; i < items.length; i++) {
            // Check for cancellation
            if (cancellationToken?.isCancellationRequested) {
                console.log(`Linker: Operation cancelled at item ${i}/${items.length}`);
                break;
            }

            const item = items[i];
            const promise = processor(item)
                .then(result => {
                    results.push(result);
                })
                .catch(error => {
                    console.warn(`Linker: Error processing item:`, error);
                    // Continue processing other items
                })
                .finally(() => {
                    executing.delete(promise);
                });

            executing.set(promise, true);

            if (executing.size >= limit) {
                await Promise.race(Array.from(executing.keys()));
            }
        }

        await Promise.all(Array.from(executing.keys()));
        return results;
    }

    /**
     * Check if a file should be processed based on size
     */
    static async shouldProcessFile(uri: vscode.Uri, maxSizeBytes: number): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.size <= maxSizeBytes;
        } catch (error) {
            console.warn(`Linker: Could not stat file ${uri.fsPath}:`, error);
            return false; // Skip files we can't stat
        }
    }
}
