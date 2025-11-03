import * as vscode from 'vscode';

/**
 * Cache entry for file content
 */
interface CacheEntry {
    content: string;
    version: number;
    timestamp: number;
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
     * Process items with concurrency limit
     */
    static async processWithLimit<T, R>(
        items: T[],
        processor: (item: T) => Promise<R>,
        limit: number = 10
    ): Promise<R[]> {
        const results: R[] = [];
        const executing: Promise<void>[] = [];

        for (const item of items) {
            const promise = processor(item).then(result => {
                results.push(result);
            });

            executing.push(promise);

            if (executing.length >= limit) {
                await Promise.race(executing);
                executing.splice(executing.findIndex(p => p === promise), 1);
            }
        }

        await Promise.all(executing);
        return results;
    }
}
