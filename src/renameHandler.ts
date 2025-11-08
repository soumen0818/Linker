import * as vscode from 'vscode';
import * as path from 'path';
import { PathUtils } from './pathUtils';
import { ImportScanner, ImportMatch } from './importScanner';
import { MultiLanguageScanner } from './multiLanguageScanner';
import { AliasResolver } from './aliasResolver';
import { GitIntegration } from './gitIntegration';
import { FileCache, ProgressReporter, BatchProcessor } from './performance';
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
    private gitIntegration: GitIntegration | null = null;
    private formatter: ImportFormatter;
    private diffViewProvider: DiffViewProvider | null = null;

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
        // Initialize alias resolver
        this.aliasResolver = new AliasResolver(workspaceRoot);
        await this.aliasResolver.loadTsConfig();

        // Initialize git integration
        this.gitIntegration = new GitIntegration(workspaceRoot);
        await this.gitIntegration.initialize();

        console.log('Linker: Initialized', {
            aliases: this.aliasResolver.getAliases(),
            isGitRepo: this.gitIntegration.isRepository()
        });
    }

    /**
     * Handle file/folder rename event with user confirmation
     * Shows preview and waits for user approval before applying changes
     */
    async handleRenameWithConfirmation(event: vscode.FileRenameEvent): Promise<void> {
        try {
            console.log('Linker: handleRenameWithConfirmation called');
            console.log('Linker: Renamed files:', event.files.map(f => `${f.oldUri.fsPath} -> ${f.newUri.fsPath}`));

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
     */
    private async findAllEditsQuiet(renames: RenameInfo[]): Promise<FileEdit[]> {
        const allEdits: FileEdit[] = [];
        const excludes = this.config.getExcludePatterns();

        // Create no-op progress reporter
        const noopProgress = {
            report: () => { }
        };

        // Process each rename
        for (const rename of renames) {
            // For directories, search all supported file types
            // For files, only search files that could import this file type
            let searchExtensions: string[] = [];

            if (rename.isDirectory) {
                // Directory rename: search ALL supported languages
                console.log(`Linker: Processing folder rename: ${rename.oldUri.fsPath} → ${rename.newUri.fsPath}`);
                searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'py', 'java', 'go', 'css', 'scss', 'less'];
            } else {
                // File rename: determine which file extensions can import this file
                const renamedFileExt = rename.newUri.fsPath.split('.').pop() || '';
                console.log(`Linker: Renamed file extension: ${renamedFileExt}`);

                // Group languages by their interoperability
                if (['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'].includes(renamedFileExt)) {
                    // JavaScript/TypeScript files can import each other
                    searchExtensions = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'];
                } else if (['css', 'scss', 'less'].includes(renamedFileExt)) {
                    // CSS files can import each other
                    searchExtensions = ['css', 'scss', 'less'];
                } else {
                    // Other languages: only same extension (Python, Java, Go, etc.)
                    searchExtensions = [renamedFileExt];
                }
            }

            const exPattern = '{' + excludes.join(',') + '}';
            const searchPattern = searchExtensions.length === 1
                ? `**/*.${searchExtensions[0]}`
                : `**/*.{${searchExtensions.join(',')}}`;

            console.log(`Linker: Searching for files matching: ${searchPattern}`);

            const files = await vscode.workspace.findFiles(searchPattern, exPattern);
            console.log(`Linker: Found ${files.length} files to scan`);

            const renameEdits = rename.isDirectory
                ? await this.handleFolderRename(rename, files, noopProgress)
                : await this.handleFileRename(rename, files, noopProgress);

            allEdits.push(...renameEdits);
        }

        return allEdits;
    }

    /**
     * Find all edits needed for the renames
     */
    private async findAllEdits(
        renames: RenameInfo[],
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<FileEdit[]> {
        const allEdits: FileEdit[] = [];
        const excludes = this.config.getExcludePatterns();
        const extensions = this.config.getFileExtensions();

        // Get all workspace files
        const exPattern = '{' + excludes.join(',') + '}';
        const searchPattern = `**/*.{${extensions.join(',')}}`;
        const files = await vscode.workspace.findFiles(searchPattern, exPattern);

        progress.report({ message: `Scanning ${files.length} files for imports...` });

        // Process each rename
        for (const rename of renames) {
            const renameEdits = rename.isDirectory
                ? await this.handleFolderRename(rename, files, progress)
                : await this.handleFileRename(rename, files, progress);

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

        console.log(`Linker: Processing file rename: ${oldUri.fsPath} → ${newUri.fsPath}`);

        // Scan each candidate file
        const maxConcurrent = this.config.getMaxConcurrentFiles();
        let processedCount = 0;

        const processor = async (file: vscode.Uri): Promise<FileEdit | null> => {
            if (file.fsPath === newUri.fsPath) {
                return null;
            }

            processedCount++;
            if (processedCount % 10 === 0) {
                ProgressReporter.reportScanProgress(progress, processedCount, candidateFiles.length);
            }

            return await this.scanFileForImports(file, oldUri, newUri, oldFileName);
        };

        const results = await BatchProcessor.processWithLimit(
            candidateFiles,
            processor,
            maxConcurrent
        );

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

        // Get the folder name (last part of the path)
        const oldFolderName = path.basename(oldUri.fsPath);
        const newFolderName = path.basename(newUri.fsPath);

        console.log(`Linker: Folder name changed: "${oldFolderName}" → "${newFolderName}"`);

        // Scan all candidate files for imports that reference this folder
        for (const file of candidateFiles) {
            // Skip files that are inside the renamed folder itself
            const filePath = PathUtils.normalizePath(file.fsPath);
            if (filePath.startsWith(newPath)) {
                continue;
            }

            const fileEdit = await this.scanFileForFolderImports(
                file,
                oldUri,
                newUri,
                oldFolderName,
                newFolderName
            );

            if (fileEdit) {
                edits.push(fileEdit);
            }
        }

        console.log(`Linker: Found ${edits.length} files with imports referencing the renamed folder`);

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

        for (const imp of imports) {
            // Check if this import path contains the old folder name
            const importPath = imp.importPath;

            // For Go, Python with absolute imports, Java, etc.: check if the import path contains the old folder
            if (importPath.includes(oldFolderName)) {
                console.log(`Linker: Import "${importPath}" might reference renamed folder "${oldFolderName}"`);

                // Replace the old folder name with new folder name in the import path
                const newImportPath = importPath.replace(
                    new RegExp(`\\b${oldFolderName}\\b`, 'g'),
                    newFolderName
                );

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
            } else if (languageId === 'java') {
                isMatch = MultiLanguageScanner.doesJavaImportMatchFile(imp.importPath, oldFileName);
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

                // Calculate new import path, passing original import to preserve style
                const newImportPath = PathUtils.toImportPath(file, newUri, imp.importPath);

                console.log(`Linker: Old import: "${imp.importPath}"`);
                console.log(`Linker: New import: "${newImportPath}"`);

                if (newImportPath !== imp.importPath) {
                    // Get the full original import line
                    const line = doc.lineAt(imp.line);
                    const originalImport = line.text;

                    console.log(`Linker: Original import line: "${originalImport}"`);

                    // Use formatter to create properly formatted import
                    const formattedImport = this.formatter.formatImportPath(
                        originalImport,
                        newImportPath,
                        file.fsPath
                    );

                    console.log(`Linker: Formatted import line: "${formattedImport}"`);

                    // Replace the entire line to preserve formatting
                    const range = new vscode.Range(
                        new vscode.Position(imp.line, 0),
                        new vscode.Position(imp.line, line.text.length)
                    );

                    const textEdit = vscode.TextEdit.replace(range, formattedImport);
                    textEdits.push(textEdit);

                    console.log(
                        `Linker: ${file.fsPath} line ${imp.line + 1}: "${imp.importPath}" → "${newImportPath}"`
                    );
                } else {
                    console.log(`Linker: Paths are identical, skipping`);
                }
            }
        }

        if (textEdits.length > 0) {
            return {
                file,
                edits: textEdits,
                summary: `${textEdits.length} import${textEdits.length > 1 ? 's' : ''} updated`
            };
        }

        return null;
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

                // Show what will change: current import → new import
                diffItems.push({
                    filePath: fileEdit.file.fsPath,
                    oldImport: currentLine.text.trim(), // What it is now
                    newImport: edit.newText.trim(), // What it will become
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
}
