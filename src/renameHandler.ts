import * as vscode from 'vscode';
import { PathUtils } from './pathUtils';
import { ImportScanner, ImportMatch } from './importScanner';
import { AliasResolver } from './aliasResolver';
import { GitIntegration } from './gitIntegration';
import { FileCache, ProgressReporter, BatchProcessor } from './performance';
import { LinkerConfig } from './config';

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

    constructor(config: LinkerConfig) {
        this.config = config;
        this.fileCache = new FileCache();
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

                    // Show preview
                    const approved = await this.showPreview(allEdits);

                    if (approved) {
                        await this.applyEdits(allEdits);

                        // Auto-stage if configured
                        if (this.config.autoStageChanges() && this.gitIntegration?.isRepository()) {
                            const filePaths = allEdits.map(e => e.file.fsPath);
                            await this.gitIntegration.stageFiles(filePaths);
                        }
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

        // Get all files that were inside the renamed folder
        const extensions = this.config.getFileExtensions();
        const movedFiles = await PathUtils.getFilesInDirectory(newUri, extensions);

        console.log(`Linker: Folder contains ${movedFiles.length} files`);

        // For each moved file, find imports and update them
        for (const movedFile of movedFiles) {
            const movedFilePath = PathUtils.normalizePath(movedFile.fsPath);
            const relativePath = movedFilePath.substring(newPath.length);
            const oldFilePath = oldPath + relativePath;
            const oldFileUri = vscode.Uri.file(oldFilePath);

            // Scan workspace for imports of this file
            const fileEdits = await this.handleFileRename(
                { oldUri: oldFileUri, newUri: movedFile, isDirectory: false },
                candidateFiles,
                progress
            );

            edits.push(...fileEdits);
        }

        return edits;
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
        const imports = ImportScanner.scanDocument(doc);
        const textEdits: vscode.TextEdit[] = [];

        console.log(`Linker: Scanning ${file.fsPath} for imports of "${oldFileName}"`);
        console.log(`Linker: Found ${imports.length} total imports in file`);

        for (const imp of imports) {
            console.log(`Linker: Checking import "${imp.importPath}" at columns ${imp.startColumn}-${imp.endColumn}`);

            if (ImportScanner.doesImportMatchFile(imp, oldFileName, file.fsPath, oldUri.fsPath)) {
                console.log(`Linker: ✓ MATCH! Import "${imp.importPath}" matches "${oldFileName}"`);

                // Calculate new import path
                const newImportPath = PathUtils.toImportPath(file, newUri);

                console.log(`Linker: Old import: "${imp.importPath}"`);
                console.log(`Linker: New import: "${newImportPath}"`);

                if (newImportPath !== imp.importPath) {
                    // Replace the ENTIRE quoted string (including quotes) to avoid position issues
                    // The endColumn points AT the closing quote, not after it
                    const startPos = new vscode.Position(imp.line, imp.startColumn - 1); // Include opening quote
                    const endPos = new vscode.Position(imp.line, imp.endColumn + 1);     // Include closing quote

                    // The new text should also include the quotes
                    const newQuotedImport = `${imp.quote}${newImportPath}${imp.quote}`;

                    const textEdit = vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newQuotedImport);
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
     * Show preview dialog
     */
    private async showPreview(edits: FileEdit[]): Promise<boolean> {
        // TODO: Implement enhanced preview UI in next phase
        // For now, use simple quickpick
        const totalEdits = edits.reduce((sum, e) => sum + e.edits.length, 0);
        const message = `Found ${totalEdits} import update${totalEdits > 1 ? 's' : ''} in ${edits.length} file${edits.length > 1 ? 's' : ''}`;

        const choice = await vscode.window.showInformationMessage(
            `Linker: ${message}`,
            { modal: true },
            'Apply',
            'Cancel'
        );

        return choice === 'Apply';
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
