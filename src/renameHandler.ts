import * as vscode from 'vscode';
import * as path from 'path';
import { PathUtils } from './pathUtils';
import { ImportScanner, ImportMatch } from './importScanner';
import { MultiLanguageScanner } from './multiLanguageScanner';
import { AliasResolver } from './aliasResolver';
import { PythonAliasResolver } from './pythonAliasResolver';
import { GoAliasResolver } from './goAliasResolver';
import { CSSAliasResolver } from './cssAliasResolver';
import { GitIntegration } from './gitIntegration';
import { FileCache, ProgressReporter, BatchProcessor, WorkspaceAnalyzer, TimeoutHandler } from './performance';
import { LinkerConfig } from './config';
import { ImportFormatter } from './formatter';
import { DiffViewProvider, DiffItem } from './diffViewProvider';
import { getHistoryManager, HistoryEntry, FileChange } from './historyManager';

/**
 * Represents a file edit operation
 */
export interface FileEdit {
    file: vscode.Uri;
    edits: vscode.TextEdit[];
    summary: string;
}

/**
 * Rename information
 */
export interface RenameInfo {
    oldUri: vscode.Uri;
    newUri: vscode.Uri;
    isDirectory: boolean;
}

/**
 * Main rename handler
 * Orchestrates the entire import update process
 */
export class RenameHandler {
    private config: LinkerConfig;
    private fileCache: FileCache;
    private aliasResolver: AliasResolver | null = null;
    private pythonAliasResolver: PythonAliasResolver | null = null;
    private goAliasResolver: GoAliasResolver | null = null;
    private cssAliasResolver: CSSAliasResolver | null = null;
    private gitIntegration: GitIntegration | null = null;
    private formatter: ImportFormatter;
    private diffViewProvider: DiffViewProvider | null = null;
    private workspaceAnalysis: any = null;

    constructor(config: LinkerConfig, diffViewProvider?: DiffViewProvider) {
        this.config = config;
        this.fileCache = new FileCache();
        this.formatter = new ImportFormatter();
        this.diffViewProvider = diffViewProvider || null;
    }

    /**
     * Initialize handler (load aliases, git integration, etc.)
     */
    async initialize(workspaceRoot: string): Promise<void> {
        // Initialize TypeScript/JavaScript alias resolver
        this.aliasResolver = new AliasResolver(workspaceRoot);
        await this.aliasResolver.loadTsConfig();

        // Initialize Python alias resolver
        this.pythonAliasResolver = new PythonAliasResolver(workspaceRoot);
        await this.pythonAliasResolver.loadConfig();

        // Initialize Go alias resolver
        this.goAliasResolver = new GoAliasResolver(workspaceRoot);
        await this.goAliasResolver.loadConfig();

        // Initialize CSS alias resolver
        this.cssAliasResolver = new CSSAliasResolver(workspaceRoot);
        await this.cssAliasResolver.loadConfig();

        // Initialize git integration
        this.gitIntegration = new GitIntegration(workspaceRoot);
        await this.gitIntegration.initialize();

        // Analyze workspace size for performance optimizations
        if (this.config.enableLargeCodebaseOptimizations()) {
            console.log('Linker: Analyzing workspace size...');
            this.workspaceAnalysis = await WorkspaceAnalyzer.analyzeWorkspace(
                this.config.getExcludePatterns()
            );

            if (this.workspaceAnalysis.isLargeCodebase) {
                console.log('Linker: Large codebase detected - enabling optimizations');
                console.log(`Linker: Estimated ${this.workspaceAnalysis.estimatedRelevantFiles} relevant files`);
                console.log(`Linker: Recommended concurrency: ${this.workspaceAnalysis.recommendedConcurrency}`);
            }
        }

        console.log('Linker: Initialized', {
            tsAliases: this.aliasResolver.getAliases(),
            pythonAliases: this.pythonAliasResolver.getAliases(),
            goModulePath: this.goAliasResolver.getModulePath(),
            cssAliases: this.cssAliasResolver.getAliases(),
            isGitRepo: this.gitIntegration.isRepository(),
            largeCodebase: this.workspaceAnalysis?.isLargeCodebase || false
        });
    }

    /**
     * Prepare rename edits for willRenameFiles event
     * Returns WorkspaceEdit that will be applied atomically with the rename
     * This prevents conflicts with other extensions (like Pylance)
     * 
     * CRITICAL: For Python files, we use event.waitUntil() to BLOCK Pylance
     */
    async prepareRenameEdits(event: vscode.FileWillRenameEvent): Promise<vscode.WorkspaceEdit | null> {
        try {
            console.log('Linker: prepareRenameEdits called (willRenameFiles)');
            console.log('Linker: Files being renamed:', event.files.map(f => `${f.oldUri.fsPath} -> ${f.newUri.fsPath}`));

            // Check if any Python files are being renamed
            const hasPythonFiles = event.files.some(f =>
                f.oldUri.fsPath.endsWith('.py') || f.newUri.fsPath.endsWith('.py')
            );

            // Check if auto-apply is enabled
            const autoApply = this.config.autoApply();
            console.log(`Linker: Auto-apply setting = ${autoApply}`);
            console.log(`Linker: Python files detected = ${hasPythonFiles}`);

            // For Python files, ALWAYS return edits to block Pylance (even if preview mode)
            // We use waitUntil to ensure our edits are computed first
            if (hasPythonFiles) {
                console.log('Linker: Python files detected - BLOCKING Pylance with waitUntil');

                // Compute edits ONCE and reuse (avoid double computation)
                const editsPromise = this.computeEditsForEvent(event);

                // Use waitUntil to FORCE VS Code to wait for our edits before allowing other extensions
                event.waitUntil(editsPromise.then(edits => {
                    if (edits) {
                        console.log('Linker: ✓ Successfully blocked Pylance - our edits will apply first');
                    }
                    return edits;
                }));

                // Return the same promise (no duplicate work)
                return editsPromise;
            } else if (!autoApply) {
                console.log('Linker: Auto-apply disabled and no Python files - will show preview later');
                return null; // Let didRenameFiles handle it with preview
            } else {
                console.log('Linker: Auto-apply ENABLED - preparing edits for atomic application');
            }

            return await this.computeEditsForEvent(event);
        } catch (error) {
            console.error('Linker: Error preparing rename edits:', error);
            return null; // Fall back to didRenameFiles
        }
    }

    /**
     * Helper method to compute edits for an event
     * Extracted for reuse in waitUntil and main handler
     */
    private async computeEditsForEvent(event: vscode.FileWillRenameEvent): Promise<vscode.WorkspaceEdit | null> {
        try {
            // Prepare rename information
            const renames: RenameInfo[] = [];

            for (const file of event.files) {
                const isDir = await PathUtils.isDirectory(file.oldUri);
                renames.push({
                    oldUri: file.oldUri,
                    newUri: file.newUri,
                    isDirectory: isDir
                });
            }

            // Find all edits quietly
            const allEdits = await this.findAllEditsQuiet(renames);

            if (allEdits.length === 0) {
                console.log('Linker: No edits needed');
                return null;
            }

            // Convert to WorkspaceEdit
            const workspaceEdit = new vscode.WorkspaceEdit();

            for (const fileEdit of allEdits) {
                for (const edit of fileEdit.edits) {
                    workspaceEdit.replace(fileEdit.file, edit.range, edit.newText);
                }
            }

            const totalImports = allEdits.reduce((sum, e) => sum + e.edits.length, 0);
            console.log(`Linker: Prepared ${totalImports} import updates for atomic application`);

            return workspaceEdit;
        } catch (error) {
            console.error('Linker: Error in computeEditsForEvent:', error);
            return null;
        }
    }

    /**
     * Handle Git operations after rename (runs in onDidRenameFiles)
     * This runs AFTER the file has been renamed on disk, so we can stage the changes
     */
    async handleGitRename(event: vscode.FileRenameEvent): Promise<void> {
        if (!this.config.useGitMv() || !this.gitIntegration?.isRepository()) {
            return;
        }

        try {
            console.log('Linker: handleGitRename - Recording git renames...');

            for (const file of event.files) {
                const success = await this.gitIntegration.recordRename(file.oldUri.fsPath, file.newUri.fsPath);
                if (success) {
                    console.log(`Linker: Successfully recorded git rename: ${file.oldUri.fsPath} -> ${file.newUri.fsPath}`);
                } else {
                    console.log(`Linker: Failed to record git rename: ${file.oldUri.fsPath} -> ${file.newUri.fsPath}`);
                }
            }
        } catch (error) {
            console.error('Linker: Error in handleGitRename:', error);
        }
    }

    /**
     * Handle file/folder rename event with user confirmation
     * Shows preview and waits for user approval before applying changes
     */
    async handleRenameWithConfirmation(event: vscode.FileRenameEvent): Promise<void> {
        try {
            console.log('Linker: handleRenameWithConfirmation called');
            console.log('Linker: Renamed files:', event.files.map(f => `${f.oldUri.fsPath} -> ${f.newUri.fsPath}`));

            // If auto-apply is enabled, edits were already prepared and applied in onWillRenameFiles
            // Skip finding edits again to avoid errors (old path no longer exists)
            const autoApply = this.config.autoApply();
            if (autoApply) {
                console.log('Linker: Auto-apply enabled - edits already applied in onWillRenameFiles, skipping duplicate work');
                return;
            }

            // Prepare rename information
            const renames: RenameInfo[] = [];

            for (const file of event.files) {
                const isDir = await PathUtils.isDirectory(file.newUri);
                renames.push({
                    oldUri: file.oldUri,
                    newUri: file.newUri,
                    isDirectory: isDir
                });
                console.log(`Linker: Rename detected - isDirectory: ${isDir}`);
            }

            // Find all edits
            console.log('Linker: Starting findAllEditsQuiet...');
            const allEdits = await this.findAllEditsQuiet(renames);
            console.log(`Linker: findAllEditsQuiet completed, found ${allEdits.length} file(s) with changes`);

            if (allEdits.length === 0) {
                // No changes needed
                console.log('Linker: No import updates needed');
                vscode.window.showInformationMessage(
                    'Linker: No import updates needed for the rename/move.'
                );
                return;
            }

            // Count total imports to update
            const totalImports = allEdits.reduce((sum: number, e: FileEdit) => sum + e.edits.length, 0);
            const fileCount = allEdits.length;

            console.log(`Linker: Found ${totalImports} import(s) to update in ${fileCount} file(s)`);

            // Show preview and wait for confirmation
            if (this.diffViewProvider) {
                console.log('Linker: Converting to diff items...');
                const diffItems = await this.convertToDiffItems(allEdits);
                console.log(`Linker: Converted ${diffItems.length} diff items`);

                this.diffViewProvider.updateDiff(diffItems);
                console.log('Linker: Showing preview...');

                const approved = await this.diffViewProvider.showAndWaitForConfirmation();
                console.log(`Linker: User decision - approved: ${approved}`);

                if (!approved) {
                    console.log('Linker: User cancelled the import updates');
                    vscode.window.showInformationMessage('Linker: Import updates cancelled');
                    return;
                }
            } else {
                console.log('Linker: WARNING - diffViewProvider is null!');
            }

            // User approved - apply the edits with history tracking
            await this.applyEditsWithHistory(allEdits, renames[0]);

            // Show success message in status bar (non-intrusive)
            vscode.window.setStatusBarMessage(
                `✓ Linker: Updated ${totalImports} import(s) in ${fileCount} file(s)`,
                5000 // Show for 5 seconds
            );

            // Auto-stage if configured
            if (this.config.autoStageChanges() && this.gitIntegration?.isRepository()) {
                const filePaths = allEdits.map((e: FileEdit) => e.file.fsPath);
                await this.gitIntegration.stageFiles(filePaths);
            }
        } catch (error) {
            console.error('Linker error:', error);
            vscode.window.showErrorMessage(
                `Linker: Error processing rename - ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle file/folder rename event
     */
    async handleRename(event: vscode.FileRenameEvent): Promise<void> {
        try {
            // Prepare rename information
            const renames: RenameInfo[] = [];

            for (const file of event.files) {
                const isDir = await PathUtils.isDirectory(file.newUri);
                renames.push({
                    oldUri: file.oldUri,
                    newUri: file.newUri,
                    isDirectory: isDir
                });
            }

            // Handle Git renames if enabled
            if (this.config.useGitMv() && this.gitIntegration?.isRepository()) {
                console.log('Linker: Recording git renames...');
                for (const rename of renames) {
                    await this.gitIntegration.recordRename(rename.oldUri.fsPath, rename.newUri.fsPath);
                }
            }

            // Process renames with progress
            await ProgressReporter.withProgress(
                'Linker: Scanning for import updates...',
                async (progress) => {
                    const allEdits = await this.findAllEdits(renames, progress);

                    if (allEdits.length === 0) {
                        vscode.window.showInformationMessage(
                            'Linker: No import updates needed for the rename/move.'
                        );
                        return;
                    }

                    // Count total imports to update
                    const totalImports = allEdits.reduce((sum, e) => sum + e.edits.length, 0);
                    const fileCount = allEdits.length;

                    console.log(`Linker: Found ${totalImports} import(s) to update in ${fileCount} file(s)`);

                    // Apply edits immediately (no preview approval needed)
                    await this.applyEdits(allEdits);

                    // Show info panel AFTER applying changes
                    await this.showPreview(allEdits);

                    // Auto-stage if configured
                    if (this.config.autoStageChanges() && this.gitIntegration?.isRepository()) {
                        const filePaths = allEdits.map(e => e.file.fsPath);
                        await this.gitIntegration.stageFiles(filePaths);
                    }
                }
            );
        } catch (error) {
            console.error('Linker error:', error);
            vscode.window.showErrorMessage(
                `Linker: Error processing rename - ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Find all edits needed for the renames (without progress UI)
     * Optimized for large codebases with smart scanning and limits
     */
    private async findAllEditsQuiet(renames: RenameInfo[]): Promise<FileEdit[]> {
        const allEdits: FileEdit[] = [];
        const excludes = this.config.getExcludePatterns();
        const maxFilesToScan = this.config.getMaxFilesToScan();
        const maxFileSize = this.config.getMaxFileSize();
        const smartScanningEnabled = this.config.isSmartScanningEnabled();
        const operationTimeout = this.config.getOperationTimeout();

        // Create no-op progress reporter
        const noopProgress = {
            report: () => { }
        };

        try {
            // Wrap entire operation with timeout
            return await TimeoutHandler.withTimeout(
                async () => {
                    // Process each rename
                    for (const rename of renames) {
                        let searchExtensions: string[] = [];

                        if (rename.isDirectory) {
                            console.log(`Linker: Processing folder rename: ${rename.oldUri.fsPath} → ${rename.newUri.fsPath}`);
                            searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'py', 'go', 'css', 'scss', 'less'];
                        } else {
                            const renamedFileExt = rename.newUri.fsPath.split('.').pop() || '';
                            console.log(`Linker: Renamed file extension: ${renamedFileExt}`);

                            if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(renamedFileExt)) {
                                searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'];
                            } else if (['css', 'scss', 'less'].includes(renamedFileExt)) {
                                searchExtensions = ['css', 'scss', 'less'];
                            } else {
                                searchExtensions = [renamedFileExt];
                            }
                        }

                        const exPattern = '{' + excludes.join(',') + '}';
                        const searchPattern = searchExtensions.length === 1
                            ? `**/*.${searchExtensions[0]}`
                            : `**/*.{${searchExtensions.join(',')}}`;

                        console.log(`Linker: Searching for files matching: ${searchPattern}`);

                        // Always scan ALL matching files in workspace (removed buggy "fast path" that missed files)
                        let files: vscode.Uri[];
                        const searchLimit = smartScanningEnabled ? maxFilesToScan : undefined;

                        if (searchLimit) {
                            console.log(`Linker: Limiting search to ${searchLimit} files`);
                            files = await vscode.workspace.findFiles(searchPattern, exPattern, searchLimit);

                            if (files.length === searchLimit) {
                                vscode.window.showWarningMessage(
                                    `Linker: Hit file limit (${searchLimit} files). Some imports may not be updated. ` +
                                    `Increase 'linker.performance.maxFilesToScan' in settings or disable 'linker.performance.smartScanning'.`,
                                    'Open Settings'
                                ).then(action => {
                                    if (action === 'Open Settings') {
                                        vscode.commands.executeCommand('workbench.action.openSettings', 'linker.performance');
                                    }
                                });
                            }
                        } else {
                            files = await vscode.workspace.findFiles(searchPattern, exPattern);
                        }

                        console.log(`Linker: Found ${files.length} files to scan`);

                        // Early exit if no files found
                        if (files.length === 0) {
                            console.log(`Linker: No files found matching pattern, skipping`);
                            continue;
                        }

                        console.log(`Linker: Files to scan:`, files.map(f => f.fsPath).slice(0, 20)); // Show first 20 files

                        // Filter files by size before processing
                        const validFiles: vscode.Uri[] = [];
                        let skippedFiles = 0;

                        for (const file of files) {
                            if (await BatchProcessor.shouldProcessFile(file, maxFileSize)) {
                                validFiles.push(file);
                            } else {
                                skippedFiles++;
                            }
                        }

                        if (skippedFiles > 0) {
                            console.log(`Linker: Skipped ${skippedFiles} files exceeding size limit (${maxFileSize} bytes)`);
                        }

                        console.log(`Linker: Processing ${validFiles.length} valid files`);

                        const renameEdits = rename.isDirectory
                            ? await this.handleFolderRename(rename, validFiles, noopProgress)
                            : await this.handleFileRename(rename, validFiles, noopProgress);

                        console.log(`Linker: Found ${renameEdits.length} file(s) with import changes`);
                        if (renameEdits.length > 0) {
                            console.log(`Linker: Files with changes:`, renameEdits.map(e => e.file.fsPath));
                        }

                        allEdits.push(...renameEdits);
                    }

                    return allEdits;
                },
                operationTimeout,
                `Linker: Operation timed out after ${operationTimeout}ms. Try reducing file count or increasing timeout in settings.`
            );
        } catch (error) {
            if (error instanceof Error && error.message.includes('timed out')) {
                vscode.window.showErrorMessage(
                    error.message,
                    'Open Settings'
                ).then(action => {
                    if (action === 'Open Settings') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'linker.performance');
                    }
                });
            }
            throw error;
        }
    }

    /**
     * Find all edits needed for the renames
     * Optimized for large codebases with smart scanning and limits
     */
    private async findAllEdits(
        renames: RenameInfo[],
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<FileEdit[]> {
        const allEdits: FileEdit[] = [];
        const excludes = this.config.getExcludePatterns();
        const maxFilesToScan = this.config.getMaxFilesToScan();
        const maxFileSize = this.config.getMaxFileSize();
        const smartScanningEnabled = this.config.isSmartScanningEnabled();

        // Process each rename
        for (const rename of renames) {
            let searchExtensions: string[] = [];

            if (rename.isDirectory) {
                console.log(`Linker: Processing folder rename: ${rename.oldUri.fsPath} → ${rename.newUri.fsPath}`);
                searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'py', 'go', 'css', 'scss', 'less'];
            } else {
                const renamedFileExt = rename.newUri.fsPath.split('.').pop() || '';
                console.log(`Linker: Renamed file extension: ${renamedFileExt}`);

                if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(renamedFileExt)) {
                    searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'];
                } else if (['css', 'scss', 'less'].includes(renamedFileExt)) {
                    searchExtensions = ['css', 'scss', 'less'];
                } else {
                    searchExtensions = [renamedFileExt];
                }
            }

            const exPattern = '{' + excludes.join(',') + '}';
            const searchPattern = searchExtensions.length === 1
                ? `**/*.${searchExtensions[0]}`
                : `**/*.{${searchExtensions.join(',')}}`;

            console.log(`Linker: Searching for files matching: ${searchPattern}`);

            // Smart scanning: Limit file search for large codebases
            const searchLimit = smartScanningEnabled ? maxFilesToScan : undefined;

            let files: vscode.Uri[];
            if (searchLimit) {
                console.log(`Linker: Limiting search to ${searchLimit} files`);
                files = await vscode.workspace.findFiles(searchPattern, exPattern, searchLimit);

                if (files.length === searchLimit) {
                    vscode.window.showWarningMessage(
                        `Linker: Hit file limit (${searchLimit} files). Some imports may not be updated. ` +
                        `Increase 'linker.performance.maxFilesToScan' in settings.`,
                        'Open Settings'
                    ).then(action => {
                        if (action === 'Open Settings') {
                            vscode.commands.executeCommand('workbench.action.openSettings', 'linker.performance');
                        }
                    });
                }
            } else {
                files = await vscode.workspace.findFiles(searchPattern, exPattern);
            }

            console.log(`Linker: Found ${files.length} files to scan`);
            progress.report({ message: `Scanning ${files.length} files for imports...` });

            // Early exit if no files found
            if (files.length === 0) {
                console.log(`Linker: No files found matching pattern, skipping`);
                continue;
            }

            // Filter files by size before processing
            const validFiles: vscode.Uri[] = [];
            let skippedFiles = 0;

            for (const file of files) {
                if (await BatchProcessor.shouldProcessFile(file, maxFileSize)) {
                    validFiles.push(file);
                } else {
                    skippedFiles++;
                }
            }

            if (skippedFiles > 0) {
                console.log(`Linker: Skipped ${skippedFiles} files exceeding size limit (${maxFileSize} bytes)`);
            }

            console.log(`Linker: Processing ${validFiles.length} valid files`);

            const renameEdits = rename.isDirectory
                ? await this.handleFolderRename(rename, validFiles, progress)
                : await this.handleFileRename(rename, validFiles, progress);

            allEdits.push(...renameEdits);
        }

        return allEdits;
    }

    /**
     * Handle individual file rename
     */
    private async handleFileRename(
        rename: RenameInfo,
        candidateFiles: vscode.Uri[],
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<FileEdit[]> {
        const { oldUri, newUri } = rename;
        const oldFileName = PathUtils.getFileNameWithoutExtension(oldUri);
        const edits: FileEdit[] = [];
        const maxFileSize = this.config.getMaxFileSize();

        console.log(`Linker: Processing file rename: ${oldUri.fsPath} → ${newUri.fsPath}`);

        // Use workspace-aware concurrency (INCREASED for faster processing)
        let maxConcurrent = this.config.getMaxConcurrentFiles() * 2; // Double concurrency
        if (this.workspaceAnalysis?.isLargeCodebase) {
            maxConcurrent = Math.max(maxConcurrent, this.workspaceAnalysis.recommendedConcurrency * 2);
        }

        console.log(`Linker: Using FAST concurrency limit: ${maxConcurrent}`);

        let processedCount = 0;
        let skippedCount = 0;

        const processor = async (file: vscode.Uri): Promise<FileEdit | null> => {
            if (file.fsPath === newUri.fsPath) {
                return null;
            }

            // Skip files that are too large
            if (!await BatchProcessor.shouldProcessFile(file, maxFileSize)) {
                skippedCount++;
                return null;
            }

            processedCount++;
            if (processedCount % 50 === 0) {
                ProgressReporter.reportScanProgress(progress, processedCount, candidateFiles.length);
            }

            try {
                return await this.scanFileForImports(file, oldUri, newUri, oldFileName);
            } catch (error) {
                console.warn(`Linker: Error scanning ${file.fsPath}:`, error);
                return null;
            }
        };

        const results = await BatchProcessor.processWithLimit(
            candidateFiles,
            processor,
            maxConcurrent
        );

        if (skippedCount > 0) {
            console.log(`Linker: Skipped ${skippedCount} large files`);
        }

        return results.filter((r): r is FileEdit => r !== null);
    }

    /**
     * Handle folder rename
     */
    private async handleFolderRename(
        rename: RenameInfo,
        candidateFiles: vscode.Uri[],
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<FileEdit[]> {
        const { oldUri, newUri } = rename;
        console.log(`Linker: Processing folder rename: ${oldUri.fsPath} → ${newUri.fsPath}`);

        const oldPath = PathUtils.normalizePath(oldUri.fsPath);
        const newPath = PathUtils.normalizePath(newUri.fsPath);
        const edits: FileEdit[] = [];
        const maxFileSize = this.config.getMaxFileSize();

        // Get the folder name (last part of the path)
        const oldFolderName = path.basename(oldUri.fsPath);
        const newFolderName = path.basename(newUri.fsPath);

        console.log(`Linker: Folder name changed: "${oldFolderName}" → "${newFolderName}"`);

        // Use FAST workspace-aware concurrency (doubled for performance)
        let maxConcurrent = this.config.getMaxConcurrentFiles() * 2;
        if (this.workspaceAnalysis?.isLargeCodebase) {
            maxConcurrent = Math.max(maxConcurrent, this.workspaceAnalysis.recommendedConcurrency * 2);
        }

        console.log(`Linker: Using FAST concurrency limit: ${maxConcurrent}`);

        let processedCount = 0;
        let skippedCount = 0;

        const validFiles: vscode.Uri[] = [];
        const filesInsideFolder: vscode.Uri[] = [];

        // Filter files: separate files inside renamed folder from files outside
        for (const file of candidateFiles) {
            const filePath = PathUtils.normalizePath(file.fsPath);

            // Files inside the renamed folder need package declaration updates (Go only)
            if (filePath.startsWith(newPath + '/') || filePath === newPath) {
                if (file.fsPath.endsWith('.go')) {
                    console.log(`Linker: Will update package declaration in: ${filePath}`);
                    filesInsideFolder.push(file);
                } else {
                    console.log(`Linker: Skipping non-Go file inside moved folder: ${filePath}`);
                }
                continue;
            }

            // Skip files that are too large
            if (await BatchProcessor.shouldProcessFile(file, maxFileSize)) {
                validFiles.push(file);
            } else {
                skippedCount++;
            }
        }

        if (skippedCount > 0) {
            console.log(`Linker: Skipped ${skippedCount} large files`);
        }

        console.log(`Linker: Scanning ${validFiles.length} files for folder imports`);

        // Update package declarations in Go files inside the renamed folder
        if (filesInsideFolder.length > 0) {
            console.log(`Linker: Updating package declarations in ${filesInsideFolder.length} Go files inside renamed folder`);
            for (const file of filesInsideFolder) {
                try {
                    const packageEdit = await this.updateGoPackageDeclaration(file, oldFolderName, newFolderName);
                    if (packageEdit) {
                        edits.push(packageEdit);
                    }
                } catch (error) {
                    console.warn(`Linker: Error updating package declaration in ${file.fsPath}:`, error);
                }
            }
        }

        // Reuse concurrency setting from above (already set to maxConcurrent)
        // Process files with concurrency limit
        const processor = async (file: vscode.Uri): Promise<FileEdit | null> => {
            processedCount++;
            if (processedCount % 50 === 0) {
                ProgressReporter.reportScanProgress(progress, processedCount, validFiles.length);
            }

            try {
                return await this.scanFileForFolderImports(
                    file,
                    oldUri,
                    newUri,
                    oldFolderName,
                    newFolderName
                );
            } catch (error) {
                console.warn(`Linker: Error scanning ${file.fsPath}:`, error);
                return null;
            }
        };

        const results = await BatchProcessor.processWithLimit(
            validFiles,
            processor,
            maxConcurrent  // Use the increased concurrency
        );

        const fileEdits = results.filter((r): r is FileEdit => r !== null);

        console.log(`Linker: Found ${fileEdits.length} files with imports referencing the renamed folder`);

        // Combine package declaration edits with import edits
        edits.push(...fileEdits);

        if (edits.length > 0) {
            console.log(`Linker: Total edits (package declarations + imports): ${edits.length}`);
        }

        return edits;
    }

    /**
     * Scan a file for imports that reference a renamed folder
     */
    private async scanFileForFolderImports(
        file: vscode.Uri,
        oldFolderUri: vscode.Uri,
        newFolderUri: vscode.Uri,
        oldFolderName: string,
        newFolderName: string
    ): Promise<FileEdit | null> {
        const doc = await vscode.workspace.openTextDocument(file);
        const languageId = doc.languageId;
        let imports: ImportMatch[] = [];

        // Use appropriate scanner based on language
        if (['python', 'java', 'go', 'css', 'scss', 'less'].includes(languageId)) {
            imports = MultiLanguageScanner.scanDocument(doc);
        } else {
            imports = ImportScanner.scanDocument(doc);
        }

        const textEdits: vscode.TextEdit[] = [];

        console.log(`Linker: Scanning ${file.fsPath} for folder imports (found ${imports.length} imports)`);

        // Calculate the path segment that changed for more accurate matching
        // For Go module paths, we need to find what part of the import path changed
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(oldFolderUri);
        const workspaceRoot = workspaceFolder ? PathUtils.normalizePath(workspaceFolder.uri.fsPath) : '';

        // Get the relative path from workspace root
        const oldRelativePath = workspaceRoot
            ? PathUtils.normalizePath(oldFolderUri.fsPath).replace(workspaceRoot + '/', '')
            : oldFolderName;
        const newRelativePath = workspaceRoot
            ? PathUtils.normalizePath(newFolderUri.fsPath).replace(workspaceRoot + '/', '')
            : newFolderName;

        console.log(`Linker: Path segments - old: "${oldRelativePath}", new: "${newRelativePath}"`);

        for (const imp of imports) {
            // Check if this import path contains the old folder name
            const importPath = imp.importPath;

            // SPECIAL HANDLING FOR PYTHON RELATIVE IMPORTS
            if (languageId === 'python' && importPath.startsWith('.')) {
                // For relative imports, we need to recalculate the path based on folder structure change
                // Don't use simple string replacement - it breaks relative depth
                console.log(`Linker: Skipping Python relative import "${importPath}" - will be updated by file rename handler`);
                continue;
            }

            // Check if import contains the old path segment
            // For Go: import path might be "github.com/user/project/internal/utils"
            // We need to check if it contains "internal/utils" and replace with "internal/common/utils"
            let newImportPath = importPath;

            // Try to find and replace the relative path segment
            if (importPath.includes(oldRelativePath)) {
                newImportPath = importPath.replace(oldRelativePath, newRelativePath);
                console.log(`Linker: Import "${importPath}" contains path segment "${oldRelativePath}"`);
            }
            // Fallback: try simple folder name replacement (for backward compatibility)
            else if (importPath.includes(oldFolderName)) {
                console.log(`Linker: Import "${importPath}" contains folder name "${oldFolderName}"`);
                newImportPath = importPath.replace(
                    new RegExp(`\\b${oldFolderName}\\b`, 'g'),
                    newFolderName
                );
            }

            if (newImportPath !== importPath) {
                console.log(`Linker: ✓ Updating import: "${importPath}" → "${newImportPath}"`);

                const line = doc.lineAt(imp.line);
                const originalImport = line.text;

                // Use formatter to create properly formatted import
                const formattedImport = this.formatter.formatImportPath(
                    originalImport,
                    newImportPath,
                    file.fsPath
                );

                const range = new vscode.Range(
                    new vscode.Position(imp.line, 0),
                    new vscode.Position(imp.line, line.text.length)
                );

                textEdits.push(vscode.TextEdit.replace(range, formattedImport));
            }
        }

        if (textEdits.length === 0) {
            return null;
        }

        return {
            file,
            edits: textEdits,
            summary: `Update ${textEdits.length} import(s) referencing renamed folder`
        };
    }

    /**
     * Scan a single file for imports that need updating
     */
    private async scanFileForImports(
        file: vscode.Uri,
        oldUri: vscode.Uri,
        newUri: vscode.Uri,
        oldFileName: string
    ): Promise<FileEdit | null> {
        try {
            // FAST PATH: Read file as text first to check if it even contains the old filename
            // This avoids expensive document parsing for files that don't need updates
            const fileContent = await vscode.workspace.fs.readFile(file);
            const textContent = Buffer.from(fileContent).toString('utf8');

            const baseNameNoExt = path.basename(oldUri.fsPath, path.extname(oldUri.fsPath));
            const baseNameWithExt = path.basename(oldUri.fsPath);

            // Quick string check - if filename not mentioned at all, skip expensive parsing
            // Check multiple variants: "user", "user.py", "/user", ".user"
            const hasReference =
                textContent.includes(baseNameNoExt) ||
                textContent.includes(baseNameWithExt) ||
                textContent.includes('/' + baseNameNoExt) ||
                textContent.includes('.' + baseNameNoExt) ||
                textContent.includes(baseNameNoExt + '.') ||
                textContent.includes(baseNameNoExt + '/');

            if (!hasReference) {
                console.log(`Linker: Fast skip - file doesn't contain "${baseNameNoExt}" in any form`);
                return null; // File definitely doesn't import the renamed file
            }

            console.log(`Linker: File contains reference to "${baseNameNoExt}" - parsing imports...`);

            // ALWAYS get fresh document from VS Code, don't use cache
            // This ensures we have the latest content after previous renames
            const doc = await vscode.workspace.openTextDocument(file);

            // Use MultiLanguageScanner for non-JS/TS files, ImportScanner for JS/TS
            const languageId = doc.languageId;
            let imports: ImportMatch[] = [];

            if (['python', 'java', 'go', 'css', 'scss', 'less'].includes(languageId)) {
                console.log(`Linker: Using MultiLanguageScanner for ${languageId} file`);
                imports = MultiLanguageScanner.scanDocument(doc);
            } else {
                console.log(`Linker: Using ImportScanner for ${languageId} file`);
                imports = ImportScanner.scanDocument(doc);
            }

            const textEdits: vscode.TextEdit[] = [];

            console.log(`Linker: Scanning ${file.fsPath} for imports of "${oldFileName}"`);
            console.log(`Linker: Found ${imports.length} total imports in file`);

            for (const imp of imports) {
                console.log(`Linker: Checking import "${imp.importPath}" at columns ${imp.startColumn}-${imp.endColumn}`);

                // Use language-specific matching
                let isMatch = false;
                if (languageId === 'python') {
                    isMatch = MultiLanguageScanner.doesPythonImportMatchFile(imp.importPath, oldFileName);
                } else if (languageId === 'go') {
                    isMatch = MultiLanguageScanner.doesGoImportMatchFile(imp.importPath, oldFileName);
                } else if (['css', 'scss', 'less'].includes(languageId)) {
                    // CSS imports can be relative or without ./ prefix
                    // "partials/variables.css" or "./partials/variables.css"
                    isMatch = MultiLanguageScanner.doesCSSImportMatchFile(imp.importPath, oldFileName);
                } else {
                    isMatch = ImportScanner.doesImportMatchFile(imp, oldFileName, file.fsPath, oldUri.fsPath);
                }

                if (isMatch) {
                    console.log(`Linker: ✓ MATCH! Import "${imp.importPath}" matches "${oldFileName}"`);

                    // Get the appropriate alias resolver based on language
                    let resolver: any = null;
                    if (languageId === 'python') {
                        resolver = this.pythonAliasResolver;
                    } else if (languageId === 'go') {
                        resolver = this.goAliasResolver;
                    } else if (['css', 'scss', 'less'].includes(languageId)) {
                        resolver = this.cssAliasResolver;
                    } else {
                        resolver = this.aliasResolver; // TypeScript/JavaScript
                    }

                    // Calculate new import path, passing original import, alias resolver, and language
                    const newImportPath = PathUtils.toImportPath(file, newUri, imp.importPath, resolver, languageId);

                    console.log(`Linker: Old import: "${imp.importPath}"`);
                    console.log(`Linker: New import: "${newImportPath}"`);

                    if (newImportPath !== imp.importPath) {
                        // Get the line to see what we're replacing
                        const line = doc.lineAt(imp.line);
                        const textToReplace = line.text.substring(imp.startColumn, imp.endColumn);

                        console.log(`Linker: Line text: "${line.text}"`);
                        console.log(`Linker: Columns: ${imp.startColumn} to ${imp.endColumn}`);
                        console.log(`Linker: Text to replace: "${textToReplace}"`);
                        console.log(`Linker: Replacement: "${newImportPath}"`);

                        // IMPORTANT: Replace ONLY the import path (between quotes), not the entire line
                        // The ImportMatch gives us exact column positions of the import path
                        const range = new vscode.Range(
                            new vscode.Position(imp.line, imp.startColumn),
                            new vscode.Position(imp.line, imp.endColumn)
                        );

                        const textEdit = vscode.TextEdit.replace(range, newImportPath);
                        textEdits.push(textEdit);

                        console.log(
                            `Linker: ${file.fsPath} line ${imp.line + 1}: "${imp.importPath}" → "${newImportPath}"`
                        );
                    } else {
                        console.log(`Linker: Paths are identical, skipping`);
                    }
                }
            }

            if (textEdits.length === 0) {
                return null;
            }

            return {
                file,
                edits: textEdits,
                summary: `Update ${textEdits.length} import(s) of "${oldFileName}"`
            };
        } catch (error) {
            console.error(`Linker: Error scanning file ${file.fsPath}:`, error);
            // Return null instead of throwing to continue processing other files
            return null;
        }
    }

    /**
     * Convert FileEdit[] to DiffItem[] for preview
     */
    private async convertToDiffItems(edits: FileEdit[]): Promise<DiffItem[]> {
        const diffItems: DiffItem[] = [];

        for (const fileEdit of edits) {
            const doc = await vscode.workspace.openTextDocument(fileEdit.file);

            for (const edit of fileEdit.edits) {
                // Get the current line
                const currentLine = doc.lineAt(edit.range.start.line);
                const oldLineText = currentLine.text;

                // Apply the edit to show what the new line will look like
                const beforeEdit = oldLineText.substring(0, edit.range.start.character);
                const afterEdit = oldLineText.substring(edit.range.end.character);
                const newLineText = beforeEdit + edit.newText + afterEdit;

                // Show what will change: current import → new import
                diffItems.push({
                    filePath: fileEdit.file.fsPath,
                    oldImport: oldLineText.trim(),
                    newImport: newLineText.trim(),
                    line: edit.range.start.line
                });
            }
        }

        return diffItems;
    }

    /**
     * Show preview/summary of changes (informational only, no approval needed)
     */
    private async showPreview(edits: FileEdit[]): Promise<void> {
        const config = vscode.workspace.getConfiguration('linker');
        const useDiffView = config.get<boolean>('preview.diffView', true);

        if (!useDiffView || !this.diffViewProvider) {
            return; // Skip preview if disabled or not available
        }

        // Build diff items for the diff view (showing what WAS changed)
        const diffItems: DiffItem[] = [];

        for (const fileEdit of edits) {
            const doc = await vscode.workspace.openTextDocument(fileEdit.file);

            for (const edit of fileEdit.edits) {
                // Get the current line (already updated)
                const currentLine = doc.lineAt(edit.range.start.line);

                // Show what changed: old import → new import
                diffItems.push({
                    filePath: fileEdit.file.fsPath,
                    oldImport: edit.newText.trim(), // What it was before we changed it
                    newImport: currentLine.text.trim(), // What it is now
                    line: edit.range.start.line
                });
            }
        }

        console.log(`Linker: Showing summary of ${diffItems.length} changes made`);

        // Show the summary panel (no approval needed, just informational)
        this.diffViewProvider.updateDiff(diffItems);
        await this.diffViewProvider.show();
    }

    /**
     * Apply all edits with history tracking for undo/redo
     */
    private async applyEditsWithHistory(fileEdits: FileEdit[], renameInfo: RenameInfo): Promise<void> {
        // Capture original content before applying edits
        const fileChanges: FileChange[] = [];

        for (const item of fileEdits) {
            try {
                const doc = await vscode.workspace.openTextDocument(item.file);
                const originalContent = doc.getText();

                // We'll capture the new content after applying edits
                fileChanges.push({
                    filePath: item.file.fsPath,
                    originalContent: originalContent,
                    newContent: '', // Will be filled after applying edits
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error(`Linker: Failed to read ${item.file.fsPath}:`, error);
            }
        }

        // Apply the edits
        const wsEdit = new vscode.WorkspaceEdit();
        for (const item of fileEdits) {
            for (const edit of item.edits) {
                wsEdit.replace(item.file, edit.range, edit.newText);
            }
        }

        const success = await vscode.workspace.applyEdit(wsEdit);

        if (success) {
            // Clear file cache after successful edits
            this.fileCache.clear();

            // Save all edited files and capture new content
            for (let i = 0; i < fileEdits.length; i++) {
                try {
                    const doc = await vscode.workspace.openTextDocument(fileEdits[i].file);

                    // Capture new content
                    fileChanges[i].newContent = doc.getText();

                    // Save if dirty
                    if (doc.isDirty) {
                        await doc.save();
                    }
                } catch (error) {
                    console.error(`Linker: Failed to save ${fileEdits[i].file.fsPath}:`, error);
                }
            }

            // Save to history
            const historyManager = getHistoryManager();
            const oldFileName = path.basename(renameInfo.oldUri.fsPath);
            const newFileName = path.basename(renameInfo.newUri.fsPath);
            const historyEntry: HistoryEntry = {
                id: `rename-${Date.now()}`,
                description: `Renamed ${oldFileName} to ${newFileName}`,
                changes: fileChanges,
                timestamp: Date.now(),
                oldPath: renameInfo.oldUri.fsPath,
                newPath: renameInfo.newUri.fsPath
            };

            historyManager.addEntry(historyEntry);
            console.log('Linker: Saved to history for undo/redo');

            // Small delay to ensure VS Code has fully processed the changes
            await new Promise(resolve => setTimeout(resolve, 100));
        } else {
            vscode.window.showErrorMessage('Linker: Failed to apply some edits');
        }
    }

    /**
     * Apply all edits
     */
    private async applyEdits(fileEdits: FileEdit[]): Promise<void> {
        const wsEdit = new vscode.WorkspaceEdit();

        for (const item of fileEdits) {
            for (const edit of item.edits) {
                wsEdit.replace(item.file, edit.range, edit.newText);
            }
        }

        const success = await vscode.workspace.applyEdit(wsEdit);

        if (success) {
            // Clear file cache after successful edits
            this.fileCache.clear();

            // Save all edited files to ensure changes are persisted
            const savePromises = fileEdits.map(async (item) => {
                try {
                    const doc = await vscode.workspace.openTextDocument(item.file);
                    if (doc.isDirty) {
                        await doc.save();
                    }
                } catch (error) {
                    console.error(`Linker: Failed to save ${item.file.fsPath}:`, error);
                }
            });
            await Promise.all(savePromises);

            // Small delay to ensure VS Code has fully processed the changes
            await new Promise(resolve => setTimeout(resolve, 100));

            const totalEdits = fileEdits.reduce((sum, e) => sum + e.edits.length, 0);
            const fileCount = fileEdits.length;

            vscode.window.showInformationMessage(
                `Linker: Updated ${totalEdits} import${totalEdits > 1 ? 's' : ''} in ${fileCount} file${fileCount > 1 ? 's' : ''}`
            );
        } else {
            vscode.window.showErrorMessage('Linker: Failed to apply some edits');
        }
    }

    /**
     * Update package declaration in a Go file
     */
    private async updateGoPackageDeclaration(
        file: vscode.Uri,
        oldPackageName: string,
        newPackageName: string
    ): Promise<FileEdit | null> {
        try {
            const doc = await vscode.workspace.openTextDocument(file);
            const textEdits: vscode.TextEdit[] = [];

            // Find package declaration (should be at the top of the file)
            for (let i = 0; i < Math.min(20, doc.lineCount); i++) {
                const line = doc.lineAt(i);
                const text = line.text.trim();

                // Match: package oldPackageName
                const packageRegex = /^package\s+(\w+)/;
                const match = text.match(packageRegex);

                if (match && match[1] === oldPackageName) {
                    console.log(`Linker: Found package declaration at line ${i}: "${text}"`);
                    console.log(`Linker: Updating package ${oldPackageName} → ${newPackageName}`);

                    const newLine = line.text.replace(
                        new RegExp(`\\bpackage\\s+${oldPackageName}\\b`),
                        `package ${newPackageName}`
                    );

                    const range = new vscode.Range(
                        new vscode.Position(i, 0),
                        new vscode.Position(i, line.text.length)
                    );

                    textEdits.push(vscode.TextEdit.replace(range, newLine));
                    break; // Only one package declaration per file
                }
            }

            if (textEdits.length === 0) {
                console.log(`Linker: No package declaration found for ${oldPackageName} in ${file.fsPath}`);
                return null;
            }

            return {
                file,
                edits: textEdits,
                summary: `Update package declaration from ${oldPackageName} to ${newPackageName}`
            };
        } catch (error) {
            console.error(`Linker: Error updating package declaration in ${file.fsPath}:`, error);
            return null;
        }
    }
}
