import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Utilities for working with file paths and imports
 */
export class PathUtils {
    /**
     * Convert a file URI to a relative import path
     * @param from The file that contains the import
     * @param to The file being imported
     * @param originalImport Optional: the original import path (for preserving style)
     * @param aliasResolver Optional: alias resolver for converting paths to aliases (can be any language-specific resolver)
     * @param languageId Optional: language ID to determine import format
     * @returns Relative import path (e.g., './utils', '../components/Button')
     */
    static toImportPath(from: vscode.Uri, to: vscode.Uri, originalImport?: string, aliasResolver?: any, languageId?: string): string {
        // Convert Windows paths to POSIX
        const fromPath = from.fsPath.replace(/\\/g, '/');
        const toPath = to.fsPath.replace(/\\/g, '/');

        console.log('Linker [toImportPath]: from =', fromPath);
        console.log('Linker [toImportPath]: to =', toPath);
        console.log('Linker [toImportPath]: originalImport =', originalImport);
        console.log('Linker [toImportPath]: languageId =', languageId);

        // Determine the language from file extension if not provided
        if (!languageId) {
            if (toPath.endsWith('.py')) {
                languageId = 'python';
            } else if (toPath.endsWith('.java')) {
                languageId = 'java';
            } else if (toPath.endsWith('.go')) {
                languageId = 'go';
            } else if (toPath.match(/\.(css|scss|sass|less)$/)) {
                languageId = 'css';
            } else {
                languageId = 'javascript'; // Default to JS/TS
            }
        }

        // Handle TypeScript/JavaScript aliases
        if (languageId === 'javascript' || languageId === 'typescript') {
            return this.handleJavaScriptImport(toPath, fromPath, originalImport, aliasResolver);
        }

        // Handle Python aliases
        if (languageId === 'python') {
            return this.handlePythonImport(toPath, fromPath, originalImport, aliasResolver);
        }

        // Handle Java aliases
        if (languageId === 'java') {
            return this.handleJavaImport(toPath, fromPath, originalImport, aliasResolver);
        }

        // Handle Go aliases
        if (languageId === 'go') {
            return this.handleGoImport(toPath, fromPath, originalImport, aliasResolver);
        }

        // Handle CSS aliases
        if (languageId === 'css' || languageId === 'scss' || languageId === 'less') {
            return this.handleCSSImport(toPath, fromPath, originalImport, aliasResolver);
        }

        // Fallback: relative path
        return this.getRelativePath(fromPath, toPath);
    }

    /**
     * Handle JavaScript/TypeScript imports with aliases
     */
    private static handleJavaScriptImport(toPath: string, fromPath: string, originalImport?: string, aliasResolver?: any): string {
        // Check if original import is a path alias (@/, ~/, etc.)
        const isAlias = originalImport &&
            !originalImport.startsWith('.') &&
            !originalImport.startsWith('/') &&
            (originalImport.startsWith('@/') || originalImport.startsWith('~/') || originalImport.includes('/'));

        if (isAlias && originalImport) {
            // If we have an alias resolver, try to convert the new path to an alias
            if (aliasResolver && aliasResolver.filePathToAlias) {
                const newAliasPath = aliasResolver.filePathToAlias(toPath);
                if (newAliasPath) {
                    console.log('Linker [JS/TS]: Converted to alias path =', newAliasPath);
                    return newAliasPath;
                }
            }

            // Fallback: Preserve the alias path structure, only update the filename
            const pathParts = originalImport.split('/');
            const newFileName = path.posix.basename(toPath).replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');
            pathParts[pathParts.length - 1] = newFileName;
            const newAliasPath = pathParts.join('/');

            console.log('Linker [JS/TS]: Preserved alias path =', newAliasPath);
            return newAliasPath;
        }

        // Regular relative import
        const fromDir = path.posix.dirname(fromPath);
        let rel = path.posix.relative(fromDir, toPath);
        rel = rel.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');

        if (!rel.startsWith('.') && !rel.startsWith('/')) {
            rel = './' + rel;
        }

        console.log('Linker [JS/TS]: Relative path =', rel);
        return rel;
    }

    /**
     * Handle Python imports with aliases
     */
    private static handlePythonImport(toPath: string, fromPath: string, originalImport?: string, aliasResolver?: any): string {
        // Check if original import uses an alias
        const isAlias = originalImport && aliasResolver && aliasResolver.isAliasedImport && aliasResolver.isAliasedImport(originalImport);

        if (isAlias && aliasResolver && aliasResolver.filePathToAlias) {
            const newAliasPath = aliasResolver.filePathToAlias(toPath);
            if (newAliasPath) {
                console.log('Linker [Python]: Converted to alias path =', newAliasPath);
                return newAliasPath;
            }
        }

        // Check if original import was relative (started with .)
        const isRelativeImport = originalImport && originalImport.startsWith('.');

        if (isRelativeImport) {
            // RELATIVE IMPORT - calculate path relative to current file's directory
            const fromDir = path.posix.dirname(fromPath);
            let rel = path.posix.relative(fromDir, toPath);
            rel = rel.replace(/\.py$/, '');

            // Convert path to Python relative import notation
            const parts = rel.split('/');
            let dotCount = 1; // Start with at least one dot for same directory
            let moduleParts: string[] = [];

            for (const part of parts) {
                if (part === '.') {
                    // Same directory - already have dot
                } else if (part === '..') {
                    dotCount += 1; // Add dot for each parent directory
                } else {
                    moduleParts.push(part);
                }
            }

            const prefix = '.'.repeat(dotCount);
            const modulePath = moduleParts.length > 0 ? moduleParts.join('.') : '';
            rel = prefix + modulePath;

            console.log('Linker [Python]: Relative import =', rel);
            return rel;
        } else {
            // ABSOLUTE IMPORT - calculate NEW module path from file location
            // Need to determine the project root and construct path from there

            // Get the new file's directory structure
            const toPathNormalized = toPath.replace(/\\/g, '/').replace(/\.py$/, '');

            // Try to extract module path from toPath
            // Look for common project root indicators (src/, lib/, app/, or workspace root)
            let modulePath = '';

            // Find workspace root by looking for src/ or other common patterns
            const srcMatch = toPathNormalized.match(/\/(src|lib|app|pkg)\/(.+)$/);
            if (srcMatch) {
                // Extract path after src/: "/path/to/src/models/user" → "src.models.user"
                const rootFolder = srcMatch[1]; // "src", "lib", etc.
                const afterRoot = srcMatch[2];  // "models/user"
                modulePath = rootFolder + '.' + afterRoot.replace(/\//g, '.');
            } else {
                // Fallback: try to preserve original import structure but update the path
                if (originalImport) {
                    // Parse: "src.models.account" → find which parts changed
                    const importParts = originalImport.split('.');

                    // Get the new file's path segments
                    const toPathSegments = toPathNormalized.split('/');
                    const newFileName = toPathSegments[toPathSegments.length - 1];

                    // Try to find the root package by matching with original import
                    // e.g., if original is "src.utils.validators" and file moved to "src/services/validators.py"
                    // then new should be "src.services.validators"
                    const rootPackage = importParts[0]; // e.g., "src"
                    const rootIndex = toPathSegments.indexOf(rootPackage);

                    if (rootIndex >= 0) {
                        // Build path from root package: ["src", "services", "validators"] → "src.services.validators"
                        modulePath = toPathSegments.slice(rootIndex).join('.');
                    } else {
                        // Last resort: just replace the last part of original import with new filename
                        const basePath = importParts.slice(0, -1);
                        basePath.push(newFileName);
                        modulePath = basePath.join('.');
                    }
                } else {
                    // No original import, just use filename
                    modulePath = path.posix.basename(toPath, '.py');
                }
            }

            console.log('Linker [Python]: Absolute import =', modulePath);
            return modulePath;

            // Fallback: just return the filename if we can't determine the module path
            const fileName = path.posix.basename(toPath, '.py');
            console.log('Linker [Python]: Fallback to filename =', fileName);
            return fileName;
        }
    }

    /**
     * Handle Java imports with aliases
     */
    private static handleJavaImport(toPath: string, fromPath: string, originalImport?: string, aliasResolver?: any): string {
        // Check if we can use alias resolver
        if (aliasResolver && aliasResolver.filePathToAlias) {
            const packagePath = aliasResolver.filePathToAlias(toPath);
            if (packagePath) {
                // Check if this is a static import
                if (originalImport && originalImport.includes('.')) {
                    const parts = originalImport.split('.');
                    const lastPart = parts[parts.length - 1];

                    // If last part starts with lowercase, it's likely a method/field (static import)
                    if (lastPart.length > 0 && lastPart[0] === lastPart[0].toLowerCase()) {
                        // Preserve the method/field name
                        console.log('Linker [Java]: Static import path =', packagePath + '.' + lastPart);
                        return packagePath + '.' + lastPart;
                    }
                }

                console.log('Linker [Java]: Package path =', packagePath);
                return packagePath;
            }
        }

        // Fallback: preserve structure with new class name
        if (originalImport && originalImport.includes('.')) {
            const parts = originalImport.split('.');
            const newClassName = path.posix.basename(toPath).replace(/\.java$/, '');

            const lastPart = parts[parts.length - 1];
            const isLastPartClass = lastPart.length > 0 && lastPart[0] === lastPart[0].toUpperCase();

            if (isLastPartClass) {
                parts[parts.length - 1] = newClassName;
            } else if (parts.length > 1) {
                parts[parts.length - 2] = newClassName;
            }

            const result = parts.join('.');
            console.log('Linker [Java]: Fallback package path =', result);
            return result;
        }

        // Last resort: just the class name
        const className = path.posix.basename(toPath).replace(/\.java$/, '');
        console.log('Linker [Java]: Class name only =', className);
        return className;
    }

    /**
     * Handle Go imports with aliases
     */
    private static handleGoImport(toPath: string, fromPath: string, originalImport?: string, aliasResolver?: any): string {
        // Check if we can use alias resolver
        if (aliasResolver && aliasResolver.filePathToAlias) {
            const importPath = aliasResolver.filePathToAlias(toPath);
            if (importPath) {
                console.log('Linker [Go]: Module import path =', importPath);
                return importPath;
            }
        }

        // Fallback: preserve structure with new package name
        if (originalImport && originalImport.includes('/')) {
            const parts = originalImport.split('/');
            const newPackageName = path.posix.dirname(toPath).split('/').pop() || '';
            parts[parts.length - 1] = newPackageName;

            const result = parts.join('/');
            console.log('Linker [Go]: Fallback import path =', result);
            return result;
        }

        // Last resort: just directory name
        const packageName = path.posix.dirname(toPath).split('/').pop() || '';
        console.log('Linker [Go]: Package name only =', packageName);
        return packageName;
    }

    /**
     * Handle CSS imports with aliases
     */
    private static handleCSSImport(toPath: string, fromPath: string, originalImport?: string, aliasResolver?: any): string {
        // Check if original import uses an alias
        const isAlias = originalImport && aliasResolver && aliasResolver.isAliasedImport && aliasResolver.isAliasedImport(originalImport);

        if (isAlias && aliasResolver && aliasResolver.filePathToAlias) {
            const newAliasPath = aliasResolver.filePathToAlias(toPath);
            if (newAliasPath) {
                console.log('Linker [CSS]: Converted to alias path =', newAliasPath);
                return newAliasPath;
            }
        }

        // Regular relative import - keep extension for CSS
        const fromDir = path.posix.dirname(fromPath);
        let rel = path.posix.relative(fromDir, toPath);

        if (!rel.startsWith('.') && !rel.startsWith('/')) {
            rel = './' + rel;
        }

        console.log('Linker [CSS]: Relative path =', rel);
        return rel;
    }

    /**
     * Get relative path between two files
     */
    private static getRelativePath(fromPath: string, toPath: string): string {
        const fromDir = path.posix.dirname(fromPath);
        let rel = path.posix.relative(fromDir, toPath);

        if (!rel.startsWith('.') && !rel.startsWith('/')) {
            rel = './' + rel;
        }

        return rel;
    }

    /**
     * Check if a URI represents a directory
     */
    static async isDirectory(uri: vscode.Uri): Promise<boolean> {
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.type === vscode.FileType.Directory;
        } catch {
            return false;
        }
    }

    /**
     * Get all files recursively in a directory
     */
    static async getFilesInDirectory(dirUri: vscode.Uri, extensions: string[]): Promise<vscode.Uri[]> {
        const pattern = new vscode.RelativePattern(dirUri, `**/*.{${extensions.join(',')}}`);
        return await vscode.workspace.findFiles(pattern);
    }

    /**
     * Extract filename without extension
     */
    static getFileNameWithoutExtension(uri: vscode.Uri): string {
        const filename = path.posix.basename(uri.path);
        return filename.replace(/\.(js|ts|jsx|tsx|mjs|cjs)$/, '');
    }

    /**
     * Normalize path for comparison (handles Windows vs POSIX)
     */
    static normalizePath(filePath: string): string {
        return filePath.replace(/\\/g, '/');
    }
}
